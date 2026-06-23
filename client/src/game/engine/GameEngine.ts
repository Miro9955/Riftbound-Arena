import type { GameCard } from "../../data/cards";
import type { AbilityEngine } from "../abilities/AbilityEngine";
import type {
  BattlefieldId,
  DeckValidationError,
  DropZoneId,
  GameState,
  PlayerState,
  ZoneId,
} from "../gameState";
import {
  createInitialGameState,
  emptyBattlefields,
  emptyZones,
  isBattlefieldId,
  TurnPhase,
} from "../gameState";
import { CardManager } from "./CardManager";
import type { GameEvent, GameEventListener } from "./GameEvents";
import { TurnController } from "./TurnController";
import { TurnManager } from "./TurnManager";
import { ZoneManager } from "./ZoneManager";

const MAIN_DECK_MINIMUM_SIZE = 40;
const RUNE_DECK_SIZE = 12;
const STARTING_HAND_SIZE = 4;
const DEFAULT_MAIN_DECK_COPY_LIMIT = 3;

export type PlayerSetupConfig = {
  playerId: string;
  championLegend: GameCard;
  chosenChampion: GameCard;
  mainDeck: GameCard[];
  runeDeck: GameCard[];
};

export type GameSetupConfig = {
  players: PlayerSetupConfig[];
  firstPlayerId?: string;
  playerOrder?: string[];
  rng?: () => number;
};

export type DeckValidationResult = {
  ok: boolean;
  errors: DeckValidationError[];
};

export type GameSetupResult = DeckValidationResult;

export type PlayCardValidationResult = {
  ok: boolean;
  errors: string[];
};

export type MoveUnitValidationResult = {
  ok: boolean;
  errors: string[];
};

export class GameEngine {
  private state: GameState;

  private listeners = new Set<GameEventListener>();

  private abilityEngine?: AbilityEngine;

  constructor(initialState: GameState = createInitialGameState()) {
    this.state = initialState;
  }

  getState() {
    return this.state;
  }

  setState(state: GameState) {
    this.state = state;
  }

  setAbilityEngine(abilityEngine: AbilityEngine) {
    this.abilityEngine = abilityEngine;
  }

  getAbilityEngine() {
    return this.abilityEngine;
  }

  setInitialHand(cards: GameCard[]) {
    this.state = {
      ...this.state,
      hand: cards,
      zones: ZoneManager.createEmptyZones(),
      battlefields: ZoneManager.createEmptyBattlefields(),
    };
  }

  subscribe(listener: GameEventListener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  validateDeck(playerConfig: PlayerSetupConfig): DeckValidationResult {
    const errors = this.validatePlayerDeck(playerConfig);

    if (errors.length > 0) {
      this.emit({
        type: "DeckRejected",
        playerId: playerConfig.playerId,
        errors,
      });

      return {
        ok: false,
        errors,
      };
    }

    this.emit({
      type: "DeckValidated",
      playerId: playerConfig.playerId,
    });

    return {
      ok: true,
      errors,
    };
  }

  startGameSetup(config: GameSetupConfig): GameSetupResult {
    const playerIds = config.players.map((player) => player.playerId);

    this.emit({
      type: "GameSetupStarted",
      playerIds,
    });

    // Core Rules 101-103: deck construction must be validated before setup continues.
    const validationResults = config.players.map((playerConfig) => ({
      playerConfig,
      errors: this.validatePlayerDeck(playerConfig),
    }));
    const errors = validationResults.flatMap((result) => result.errors);

    if (errors.length > 0) {
      this.state = {
        ...this.state,
        setup: {
          ...this.state.setup,
          status: "VALIDATING_DECKS",
          decksValidated: false,
          validationErrors: errors,
        },
      };

      for (const result of validationResults) {
        if (result.errors.length > 0) {
          this.emit({
            type: "DeckRejected",
            playerId: result.playerConfig.playerId,
            errors: result.errors,
          });
        }
      }

      return {
        ok: false,
        errors,
      };
    }

    for (const playerConfig of config.players) {
      this.emit({
        type: "DeckValidated",
        playerId: playerConfig.playerId,
      });
    }

    const playerOrder = this.getPlayerOrder(config);
    const firstPlayerId = playerOrder[0];
    const rng = config.rng ?? Math.random;
    const players = config.players.reduce<Record<string, PlayerState>>(
      (nextPlayers, playerConfig) => {
        // Core Rules 110-118: setup shuffles each player's main and rune decks before starting hands.
        const shuffledMainDeck = this.shuffleCards(playerConfig.mainDeck, rng);
        const shuffledRuneDeck = this.shuffleCards(playerConfig.runeDeck, rng);
        const startingHand = shuffledMainDeck.slice(0, STARTING_HAND_SIZE);
        const deck = shuffledMainDeck.slice(STARTING_HAND_SIZE);

        nextPlayers[playerConfig.playerId] = {
          deck,
          runeDeck: shuffledRuneDeck,
          channeledRunes: [],
          exhaustedRuneIds: [],
          runePool: {
            available: 0,
            spent: 0,
          },
          hand: startingHand,
          trash: [],
          banishment: [],
          base: [],
          championLegend: playerConfig.championLegend,
          chosenChampion: playerConfig.chosenChampion,
          setup: {
            deckValidated: true,
            // Core Rules 116: each player draws the official starting hand during setup.
            startingHandDrawn: true,
            // Core Rules 117-117.3: setup prepares mulligan choices, but resolution is a later phase.
            mulliganPending: true,
            mulliganCompleted: false,
          },
          hasMulliganed: false,
          hasDrawn: false,
          actionsRemaining: 0,
        };

        return nextPlayers;
      },
      {},
    );

    this.state = {
      hand: players[firstPlayerId]?.hand ?? [],
      zones: emptyZones(),
      battlefields: emptyBattlefields(),
      players,
      turn: {
        activePlayerId: firstPlayerId,
        turnNumber: 1,
        phase: TurnPhase.MULLIGAN,
        playerOrder,
      },
      setup: {
        status: "MULLIGAN_PENDING",
        decksValidated: true,
        firstPlayerId,
        mulliganPlayerIds: playerOrder,
        currentMulliganPlayerId: undefined,
        completedMulliganPlayerIds: [],
        mulliganSetAsideCards: {},
        mulliganComplete: false,
        startOfGameCompletedPlayerIds: [],
        validationErrors: [],
      },
    };

    for (const playerConfig of config.players) {
      const player = this.state.players[playerConfig.playerId];

      this.emit({
        type: "DeckShuffled",
        playerId: playerConfig.playerId,
        deck: "main",
      });
      this.emit({
        type: "DeckShuffled",
        playerId: playerConfig.playerId,
        deck: "rune",
      });
      this.emit({
        type: "StartingHandDrawn",
        playerId: playerConfig.playerId,
        cards: player.hand,
      });

      for (const card of player.hand) {
        this.emit({
          type: "CardDrawn",
          playerId: playerConfig.playerId,
          card,
        });
      }
    }

    this.emit({
      type: "TurnOrderDetermined",
      playerOrder,
      firstPlayerId,
    });
    this.beginMulligan();

    return {
      ok: true,
      errors: [],
    };
  }

  beginMulligan() {
    const currentMulliganPlayerId =
      this.state.setup.currentMulliganPlayerId ??
      this.state.setup.mulliganPlayerIds.find(
        (playerId) =>
          !this.state.setup.completedMulliganPlayerIds.includes(playerId),
      );

    this.state = {
      ...this.state,
      hand: currentMulliganPlayerId
        ? this.state.players[currentMulliganPlayerId]?.hand ?? []
        : this.state.hand,
      turn: {
        ...this.state.turn,
        activePlayerId: currentMulliganPlayerId ?? this.state.turn.activePlayerId,
        phase: TurnPhase.MULLIGAN,
      },
      setup: {
        ...this.state.setup,
        status: "MULLIGAN_PENDING",
        currentMulliganPlayerId,
        mulliganComplete: currentMulliganPlayerId === undefined,
      },
    };

    this.emit({
      type: "MulliganStarted",
      playerIds: this.state.setup.mulliganPlayerIds,
    });
  }

  chooseMulliganCards(playerId: string, cardInstanceIds: string[]) {
    const player = this.requireCurrentMulliganPlayer(playerId);
    const uniqueCardInstanceIds = [...new Set(cardInstanceIds)];

    // Core Rules 117-117.3: a player may set aside up to two starting-hand cards for mulligan.
    if (uniqueCardInstanceIds.length > 2) {
      throw new Error("A player may not choose more than 2 cards for mulligan.");
    }

    const previouslySetAside = this.state.setup.mulliganSetAsideCards[playerId] ?? [];
    const handWithPreviousChoices = [...player.hand, ...previouslySetAside];
    const cardsById = new Map(handWithPreviousChoices.map((card) => [card.id, card]));
    const selectedCards = uniqueCardInstanceIds.map((cardInstanceId) => {
      const card = cardsById.get(cardInstanceId);

      if (!card) {
        throw new Error("Mulligan cards must come from the player's starting hand.");
      }

      return card;
    });
    const selectedCardIds = new Set(uniqueCardInstanceIds);
    const nextHand = handWithPreviousChoices.filter(
      (card) => !selectedCardIds.has(card.id),
    );

    this.state = {
      ...this.state,
      hand: playerId === this.state.turn.activePlayerId ? nextHand : this.state.hand,
      players: {
        ...this.state.players,
        [playerId]: {
          ...player,
          hand: nextHand,
        },
      },
      setup: {
        ...this.state.setup,
        mulliganSetAsideCards: {
          ...this.state.setup.mulliganSetAsideCards,
          [playerId]: selectedCards,
        },
      },
    };

    this.emit({
      type: "CardsSetAsideForMulligan",
      playerId,
      cards: selectedCards,
    });
  }

  resolveMulligan(playerId: string) {
    const player = this.requireCurrentMulliganPlayer(playerId);
    const setAsideCards = this.state.setup.mulliganSetAsideCards[playerId] ?? [];
    const drawnCards: GameCard[] = [];

    // Core Rules 117-117.3: draw replacements before the set-aside cards are recycled.
    for (let index = 0; index < setAsideCards.length; index += 1) {
      const drawingPlayer = this.state.players[playerId];
      const [card, ...deck] = drawingPlayer.deck;

      if (card) {
        this.state = {
          ...this.state,
          hand:
            playerId === this.state.turn.activePlayerId
              ? [...this.state.hand, card]
              : this.state.hand,
          players: {
            ...this.state.players,
            [playerId]: {
              ...drawingPlayer,
              hand: [...drawingPlayer.hand, card],
              deck,
            },
          },
        };
        drawnCards.push(card);
        this.emit({
          type: "CardDrawn",
          playerId,
          card,
        });
      }
    }

    const playerAfterDraw = this.state.players[playerId] ?? player;

    // Core Rules 117.3 and 403: after replacement draw, recycled main-deck cards return to the deck.
    // TODO(Core Rules 403): add deterministic simultaneous recycle ordering when the command log/RNG model exists.
    this.state = {
      ...this.state,
      players: {
        ...this.state.players,
        [playerId]: {
          ...playerAfterDraw,
          deck: [...playerAfterDraw.deck, ...setAsideCards],
          setup: {
            ...playerAfterDraw.setup,
            mulliganPending: false,
            mulliganCompleted: true,
          },
          hasMulliganed: true,
        },
      },
      setup: {
        ...this.state.setup,
        completedMulliganPlayerIds: [
          ...this.state.setup.completedMulliganPlayerIds,
          playerId,
        ],
        mulliganSetAsideCards: {
          ...this.state.setup.mulliganSetAsideCards,
          [playerId]: [],
        },
      },
    };

    if (setAsideCards.length > 0) {
      this.emit({
        type: "CardsRecycled",
        playerId,
        cards: setAsideCards,
      });
    }

    this.emit({
      type: "MulliganCompleted",
      playerId,
    });

    this.advanceMulliganPlayer();

    return drawnCards;
  }

  advanceMulliganPlayer() {
    const completedPlayerIds = new Set(this.state.setup.completedMulliganPlayerIds);
    const nextMulliganPlayerId = this.state.setup.mulliganPlayerIds.find(
      (playerId) => !completedPlayerIds.has(playerId),
    );
    const mulliganComplete = nextMulliganPlayerId === undefined;
    const firstPlayerId =
      this.state.setup.firstPlayerId ?? this.state.turn.playerOrder[0];

    this.state = {
      ...this.state,
      hand: mulliganComplete
        ? this.state.players[firstPlayerId]?.hand ?? this.state.hand
        : this.state.players[nextMulliganPlayerId]?.hand ?? [],
      turn: {
        ...this.state.turn,
        activePlayerId: mulliganComplete
          ? firstPlayerId
          : nextMulliganPlayerId ?? this.state.turn.activePlayerId,
        phase: TurnPhase.MULLIGAN,
      },
      setup: {
        ...this.state.setup,
        currentMulliganPlayerId: nextMulliganPlayerId,
        mulliganComplete,
        startOfGameCompletedPlayerIds: mulliganComplete
          ? this.state.setup.mulliganPlayerIds
          : this.state.setup.startOfGameCompletedPlayerIds,
      },
    };
  }

  drawCard(playerId: string) {
    const result = CardManager.drawFromDeck(this.state, playerId);

    this.state = result.state;

    if (result.card) {
      this.emit({
        type: "CardDrawn",
        playerId,
        card: result.card,
      });
    }
  }

  drawRune(playerId: string) {
    const player = this.state.players[playerId];

    if (!player || player.runeDeck.length === 0) {
      return undefined;
    }

    const [card, ...runeDeck] = player.runeDeck;

    // Core Rules 156-164: runes are drawn from the separate rune deck, not the main deck.
    this.state = {
      ...this.state,
      hand:
        playerId === this.state.turn.activePlayerId
          ? [...this.state.hand, card]
          : this.state.hand,
      players: {
        ...this.state.players,
        [playerId]: {
          ...player,
          runeDeck,
          hand: [...player.hand, card],
        },
      },
    };

    this.emit({
      type: "RuneDrawn",
      playerId,
      card,
    });

    return card;
  }

  channelRune(playerId: string, runeCardInstanceId: string) {
    const player = this.state.players[playerId];

    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    const runeCard = player.hand.find((card) => card.id === runeCardInstanceId);

    if (!runeCard) {
      throw new Error("Rune must be in the player's hand before it can be channeled.");
    }

    if (runeCard.kind !== "rune") {
      throw new Error("Only rune cards can be channeled.");
    }

    const nextChanneledRunes = [...player.channeledRunes, runeCard];
    const nextHand = player.hand.filter((card) => card.id !== runeCardInstanceId);

    // Core Rules 156-164 and 417: channeling moves a rune to the player's board resource area.
    this.state = {
      ...this.state,
      hand:
        playerId === this.state.turn.activePlayerId
          ? nextHand
          : this.state.hand,
      zones: {
        ...this.state.zones,
        channeledRunes:
          playerId === this.state.turn.activePlayerId
            ? nextChanneledRunes
            : this.state.zones.channeledRunes,
      },
      players: {
        ...this.state.players,
        [playerId]: {
          ...player,
          hand: nextHand,
          channeledRunes: nextChanneledRunes,
          runePool: {
            ...player.runePool,
            available: player.runePool.available + 1,
          },
        },
      },
    };

    this.emit({
      type: "RuneChanneled",
      playerId,
      card: runeCard,
    });

    return runeCard;
  }

  recycleRune(playerId: string, runeCardInstanceId: string) {
    const player = this.state.players[playerId];

    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    const runeCard = player.channeledRunes.find(
      (card) => card.id === runeCardInstanceId,
    );

    if (!runeCard) {
      throw new Error("Rune must be channeled before it can be recycled.");
    }

    const remainingRunes = player.channeledRunes.filter(
      (card) => card.id !== runeCardInstanceId,
    );
    const wasExhausted = player.exhaustedRuneIds.includes(runeCardInstanceId);

    // Core Rules 156-164 and 403: recycled runes return to the owner's rune deck.
    // TODO(Core Rules 403): support owner-chosen ordering for multiple simultaneous rune recycles.
    this.state = {
      ...this.state,
      zones: {
        ...this.state.zones,
        channeledRunes:
          playerId === this.state.turn.activePlayerId
            ? remainingRunes
            : this.state.zones.channeledRunes,
      },
      players: {
        ...this.state.players,
        [playerId]: {
          ...player,
          runeDeck: [...player.runeDeck, runeCard],
          channeledRunes: remainingRunes,
          exhaustedRuneIds: player.exhaustedRuneIds.filter(
            (cardId) => cardId !== runeCardInstanceId,
          ),
          runePool: {
            available: Math.max(
              0,
              player.runePool.available - (wasExhausted ? 0 : 1),
            ),
            spent: player.runePool.spent,
          },
        },
      },
    };

    this.emit({
      type: "RuneRecycled",
      playerId,
      card: runeCard,
    });

    return runeCard;
  }

  getAvailableRunes(playerId: string) {
    return this.state.players[playerId]?.runePool.available ?? 0;
  }

  spendRunes(playerId: string, amountOrRequirement: number | { amount: number }) {
    const player = this.state.players[playerId];
    const amount =
      typeof amountOrRequirement === "number"
        ? amountOrRequirement
        : amountOrRequirement.amount;

    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    if (amount < 0) {
      throw new Error("Rune spend amount cannot be negative.");
    }

    if (player.runePool.available < amount) {
      throw new Error("Cannot spend more runes than available.");
    }

    const readyRuneIds = player.channeledRunes
      .map((card) => card.id)
      .filter((cardId) => !player.exhaustedRuneIds.includes(cardId));
    const runeIdsToExhaust = readyRuneIds.slice(0, amount);

    // Core Rules 156-164 and 416: using rune resources exhausts/uses available runes in the pool.
    this.state = {
      ...this.state,
      players: {
        ...this.state.players,
        [playerId]: {
          ...player,
          exhaustedRuneIds: [...player.exhaustedRuneIds, ...runeIdsToExhaust],
          runePool: {
            available: player.runePool.available - amount,
            spent: player.runePool.spent + amount,
          },
        },
      },
    };

    this.emit({
      type: "RuneSpent",
      playerId,
      amount,
    });

    return amount;
  }

  resetRunesForTurn(playerId: string) {
    const player = this.state.players[playerId];

    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    // Core Rules 163, 315.4.d, and 317.3.b: rune pools empty at official reset timings; ready channeled runes become available again.
    this.state = {
      ...this.state,
      players: {
        ...this.state.players,
        [playerId]: {
          ...player,
          exhaustedRuneIds: [],
          runePool: {
            available: player.channeledRunes.length,
            spent: 0,
          },
        },
      },
    };

    this.emit({
      type: "RunesReset",
      playerId,
    });
  }

  canPlayCard(playerId: string, cardInstanceId: string, targetZoneId: ZoneId) {
    return this.validatePlayCard(playerId, cardInstanceId, targetZoneId).ok;
  }

  validatePlayCard(
    playerId: string,
    cardInstanceId: string,
    targetZoneId: ZoneId,
  ): PlayCardValidationResult {
    const player = this.state.players[playerId];
    const errors: string[] = [];
    const card = player?.hand.find((handCard) => handCard.id === cardInstanceId);

    // Core Rules 126 and 127-129: a player can only play cards they own from their private hand.
    if (!player) {
      errors.push("Unknown player.");
    }

    if (!card) {
      errors.push("Card must be in the player's hand.");
    }

    // Core Rules 300-316 and 346-356: normal card plays happen only for the active player during the action/main phase.
    if (this.state.turn.activePlayerId !== playerId) {
      errors.push("Only the active player can play cards.");
    }

    if (this.state.turn.phase !== TurnPhase.MAIN) {
      errors.push("Cards can only be played during the main phase.");
    }

    if (card && player && player.runePool.available < this.getPlayCost(card)) {
      errors.push("Not enough available runes to play this card.");
    }

    if (card && !this.isLegalPlayDestination(card, targetZoneId)) {
      errors.push("Card cannot be played to the requested zone.");
    }

    return {
      ok: errors.length === 0,
      errors,
    };
  }

  playCard(playerId: string, cardInstanceId: string, zoneId: ZoneId) {
    const validation = this.validatePlayCard(playerId, cardInstanceId, zoneId);

    if (!validation.ok) {
      return false;
    }

    const player = this.state.players[playerId];
    const card = player.hand.find((handCard) => handCard.id === cardInstanceId);

    if (!card) {
      return false;
    }

    const cost = this.getPlayCost(card);

    if (cost > 0) {
      this.spendRunes(playerId, cost);
    }

    const playerAfterPayment = this.state.players[playerId];
    const nextHand = playerAfterPayment.hand.filter(
      (handCard) => handCard.id !== cardInstanceId,
    );
    const nextZoneCards = [...this.state.zones[zoneId], card];
    const battlefields = isBattlefieldId(zoneId)
      ? {
          ...this.state.battlefields,
          [zoneId]: {
            ...this.state.battlefields[zoneId],
            unitControllers:
              card.kind === "unit"
                ? {
                    ...this.state.battlefields[zoneId].unitControllers,
                    [card.id]: playerId,
                  }
                : this.state.battlefields[zoneId].unitControllers,
          },
        }
      : this.state.battlefields;

    // Core Rules 346-356: a legal play pays costs, moves the card from hand, then the card resolves to its destination.
    this.state = {
      ...this.state,
      hand: playerId === this.state.turn.activePlayerId ? nextHand : this.state.hand,
      zones: {
        ...this.state.zones,
        [zoneId]: nextZoneCards,
      },
      battlefields,
      players: {
        ...this.state.players,
        [playerId]: {
          ...playerAfterPayment,
          hand: nextHand,
          trash:
            zoneId === "trash"
              ? [...playerAfterPayment.trash, card]
              : playerAfterPayment.trash,
          base:
            zoneId === "base"
              ? [...playerAfterPayment.base, card]
              : playerAfterPayment.base,
        },
      },
    };

    this.emit({
      type: "CardMoved",
      cardInstanceId,
      zoneId,
    });
    this.emit({
      type: "CardPlayed",
      playerId,
      cardInstanceId,
      zoneId,
    });

    if (isBattlefieldId(zoneId)) {
      this.updateBattlefieldControl(zoneId);
    }

    return true;
  }

  canMoveUnit(playerId: string, cardInstanceId: string, targetZoneId: ZoneId) {
    return this.validateMoveUnit(playerId, cardInstanceId, targetZoneId).ok;
  }

  validateMoveUnit(
    playerId: string,
    cardInstanceId: string,
    targetZoneId: ZoneId,
  ): MoveUnitValidationResult {
    const player = this.state.players[playerId];
    const card = this.findControlledUnit(playerId, cardInstanceId);
    const errors: string[] = [];

    if (!player) {
      errors.push("Unknown player.");
    }

    // Core Rules 139-144: only unit cards can use standard unit movement.
    if (!card) {
      errors.push("Unit must be controlled by the player.");
    } else if (card.kind !== "unit") {
      errors.push("Only unit cards can move as units.");
    }

    // Core Rules 407 and 423-436: standard move destinations are battlefield locations.
    if (!isBattlefieldId(targetZoneId)) {
      errors.push("Units can only move to battlefield zones.");
    }

    // Core Rules 300-316 and 407: standard movement is an action-phase/main-phase game action.
    if (this.state.turn.activePlayerId !== playerId) {
      errors.push("Only the active player can move units.");
    }

    if (this.state.turn.phase !== TurnPhase.MAIN) {
      errors.push("Units can only move during the main phase.");
    }

    // TODO(Core Rules 401-402, 423-436): enforce exhausted/stunned/move-restricted unit state once unit status is tracked.
    return {
      ok: errors.length === 0,
      errors,
    };
  }

  moveUnit(playerId: string, cardInstanceId: string, targetZoneId: ZoneId) {
    const validation = this.validateMoveUnit(playerId, cardInstanceId, targetZoneId);

    if (!validation.ok || !isBattlefieldId(targetZoneId)) {
      return false;
    }

    const card = this.findControlledUnit(playerId, cardInstanceId);
    const fromZoneId = this.findUnitZone(cardInstanceId);

    if (!card || !fromZoneId) {
      return false;
    }

    const sourceBattlefieldId = isBattlefieldId(fromZoneId) ? fromZoneId : undefined;
    const nextZones = {
      ...this.state.zones,
      [fromZoneId]: this.state.zones[fromZoneId].filter(
        (zoneCard) => zoneCard.id !== cardInstanceId,
      ),
      [targetZoneId]: [
        ...this.state.zones[targetZoneId].filter(
          (zoneCard) => zoneCard.id !== cardInstanceId,
        ),
        card,
      ],
    };
    const nextBattlefields = {
      ...this.state.battlefields,
      [targetZoneId]: {
        ...this.state.battlefields[targetZoneId],
        unitControllers: {
          ...this.state.battlefields[targetZoneId].unitControllers,
          [cardInstanceId]: playerId,
        },
      },
    };

    if (sourceBattlefieldId) {
      const { [cardInstanceId]: _removed, ...unitControllers } =
        nextBattlefields[sourceBattlefieldId].unitControllers;

      nextBattlefields[sourceBattlefieldId] = {
        ...nextBattlefields[sourceBattlefieldId],
        unitControllers,
      };
    }

    // Core Rules 407 and 423-436: moving a unit changes its board location immediately.
    this.state = {
      ...this.state,
      zones: nextZones,
      battlefields: nextBattlefields,
      players: {
        ...this.state.players,
        [playerId]: {
          ...this.state.players[playerId],
          base:
            fromZoneId === "base"
              ? this.state.players[playerId].base.filter(
                  (baseCard) => baseCard.id !== cardInstanceId,
                )
              : this.state.players[playerId].base,
        },
      },
    };

    this.emit({
      type: "UnitMoved",
      playerId,
      cardInstanceId,
      fromZoneId,
      toZoneId: targetZoneId,
    });

    if (sourceBattlefieldId) {
      this.updateBattlefieldControl(sourceBattlefieldId);
    }

    this.updateBattlefieldControl(targetZoneId);

    return true;
  }

  getUnitsAtBattlefield(battlefieldId: BattlefieldId) {
    return this.state.zones[battlefieldId].filter((card) => card.kind === "unit");
  }

  getBattlefieldController(battlefieldId: BattlefieldId) {
    return this.state.battlefields[battlefieldId].controllerId;
  }

  updateBattlefieldControl(battlefieldId: BattlefieldId) {
    const previousControllerId = this.state.battlefields[battlefieldId].controllerId;
    const controllerIds = new Set(
      this.getUnitsAtBattlefield(battlefieldId)
        .map((unit) => this.state.battlefields[battlefieldId].unitControllers[unit.id])
        .filter((controllerId): controllerId is string => Boolean(controllerId)),
    );
    // Core Rules 165-183 and 423-431: this foundation treats an uncontested battlefield with one player's units as controlled by that player.
    // TODO(Core Rules 165-183, 437-444): replace the contested/no-controller fallback with full combat/showdown control establishment.
    const controllerId =
      controllerIds.size === 1 ? [...controllerIds][0] : undefined;

    if (previousControllerId === controllerId) {
      return controllerId;
    }

    this.state = {
      ...this.state,
      battlefields: {
        ...this.state.battlefields,
        [battlefieldId]: {
          ...this.state.battlefields[battlefieldId],
          controllerId,
        },
      },
    };

    this.emit({
      type: "BattlefieldControlChanged",
      battlefieldId,
      previousControllerId,
      controllerId,
    });

    return controllerId;
  }

  moveCard(cardInstanceId: string, zoneId: DropZoneId) {
    const moved = this.moveCardToZone(cardInstanceId, zoneId);

    if (moved) {
      this.emit({
        type: "CardMoved",
        cardInstanceId,
        zoneId,
      });
    }
  }

  discardCard(cardInstanceId: string) {
    const moved = this.moveCardToZone(cardInstanceId, "trash");

    if (moved) {
      this.emit({
        type: "CardDiscarded",
        cardInstanceId,
      });
    }
  }

  returnCardToHand(cardInstanceId: string) {
    const card = CardManager.findCard(this.state, cardInstanceId);

    if (!card) {
      return;
    }

    const nextState = ZoneManager.removeCard(this.state, cardInstanceId);
    this.state = ZoneManager.addCardToHand(nextState, card);
    this.emit({
      type: "CardMoved",
      cardInstanceId,
      zoneId: "hand",
    });
  }

  shuffleDeck(playerId: string) {
    this.state = CardManager.shuffleDeck(this.state, playerId);
  }

  endTurn() {
    const endedTurn = this.state.turn;

    if (endedTurn.phase !== TurnPhase.END) {
      this.state = {
        ...this.state,
        turn: {
          ...this.state.turn,
          phase: TurnPhase.END,
        },
      };
      this.emitPhaseChanged();
    }

    this.emit({
      type: "TurnEnded",
      activePlayerId: endedTurn.activePlayerId,
      turnNumber: endedTurn.turnNumber,
    });

    this.state = TurnManager.endTurn(this.state);
    this.emitPhaseChanged();
    this.emitRunesReset(this.state.turn.activePlayerId);
    this.emitTurnStarted();
  }

  nextPhase() {
    const previousTurn = this.state.turn;

    if (
      previousTurn.phase === TurnPhase.MULLIGAN &&
      !this.state.setup.mulliganComplete
    ) {
      throw new Error("Cannot start the first turn until all players complete mulligan.");
    }

    const result = TurnController.nextPhase(this.state);
    this.state = result.state;

    if (
      previousTurn.phase === TurnPhase.MULLIGAN &&
      this.state.turn.phase === TurnPhase.TURN_START
    ) {
      // Core Rules 115 and 300-306: the setup-selected first player starts the first turn after mulligans.
      this.emit({
        type: "FirstPlayerChosen",
        playerId: this.state.turn.activePlayerId,
      });
    }

    this.emitPhaseChanged();

    if (
      previousTurn.phase === TurnPhase.MULLIGAN ||
      previousTurn.phase === TurnPhase.END
    ) {
      this.emitRunesReset(this.state.turn.activePlayerId);
      this.emitTurnStarted();
    }

    if (result.drawnCard) {
      this.emit({
        type: "CardDrawn",
        playerId: this.state.turn.activePlayerId,
        card: result.drawnCard,
      });
    }

    if (this.state.turn.phase === "END") {
      // Core Rules 317: the active player's turn ends during the end phase.
      this.emit({
        type: "TurnEnded",
        activePlayerId: this.state.turn.activePlayerId,
        turnNumber: this.state.turn.turnNumber,
      });
    }
  }

  nextTurn() {
    this.state = TurnController.nextTurn(this.state);

    this.emitPhaseChanged();
    this.emitRunesReset(this.state.turn.activePlayerId);
    this.emitTurnStarted();
  }

  private emitPhaseChanged() {
    this.emit({
      type: "PhaseChanged",
      phase: this.state.turn.phase,
      activePlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.turnNumber,
    });
  }

  private emitTurnStarted() {
    // Core Rules 300-306: each turn starts with the next active player in turn order.
    this.emit({
      type: "TurnStarted",
      activePlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.turnNumber,
    });
  }

  private emitRunesReset(playerId: string) {
    // Core Rules 163, 315.4.d, and 317.3.b: rune pool/reset timing is player-scoped.
    this.emit({
      type: "RunesReset",
      playerId,
    });
  }

  private emit(event: GameEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private moveCardToZone(cardInstanceId: string, zoneId: DropZoneId) {
    const card = CardManager.findCard(this.state, cardInstanceId);

    if (!card) {
      return false;
    }

    const nextState = ZoneManager.removeCard(this.state, cardInstanceId);
    this.state =
      zoneId === "hand"
        ? ZoneManager.addCardToHand(nextState, card)
        : ZoneManager.addCardToZone(nextState, card, zoneId);

    return true;
  }

  private requireCurrentMulliganPlayer(playerId: string) {
    const player = this.state.players[playerId];

    if (!player) {
      throw new Error(`Unknown player: ${playerId}`);
    }

    if (this.state.setup.currentMulliganPlayerId !== playerId) {
      throw new Error("Mulligan decisions must proceed in turn order.");
    }

    if (player.setup.mulliganCompleted) {
      throw new Error("Player has already completed mulligan.");
    }

    return player;
  }

  private findControlledUnit(playerId: string, cardInstanceId: string) {
    const player = this.state.players[playerId];

    if (!player) {
      return undefined;
    }

    const baseUnit = player.base.find((card) => card.id === cardInstanceId);

    if (baseUnit) {
      return baseUnit;
    }

    for (const battlefieldId of Object.keys(
      this.state.battlefields,
    ) as BattlefieldId[]) {
      if (
        this.state.battlefields[battlefieldId].unitControllers[cardInstanceId] ===
        playerId
      ) {
        return this.state.zones[battlefieldId].find(
          (card) => card.id === cardInstanceId,
        );
      }
    }

    return undefined;
  }

  private findUnitZone(cardInstanceId: string): ZoneId | undefined {
    const baseCard = this.state.zones.base.find((card) => card.id === cardInstanceId);

    if (baseCard) {
      return "base";
    }

    for (const battlefieldId of Object.keys(
      this.state.battlefields,
    ) as BattlefieldId[]) {
      if (
        this.state.zones[battlefieldId].some(
          (card) => card.id === cardInstanceId,
        )
      ) {
        return battlefieldId;
      }
    }

    return undefined;
  }

  private getPlayCost(card: GameCard) {
    // Core Rules 353-354: base cost is paid before a card is played.
    // TODO(Core Rules 353-354): apply cost increases, discounts, alternate costs, and domain requirements once those systems exist.
    return Math.max(0, card.cost);
  }

  private isLegalPlayDestination(card: GameCard, targetZoneId: ZoneId) {
    switch (card.kind) {
      case "unit":
        // Core Rules 139-144 and 346-356: units are played to board locations.
        return targetZoneId === "base" || targetZoneId === "battlefield1" || targetZoneId === "battlefield2";
      case "spell":
        // Core Rules 149-155: spells resolve and then go to owner trash. Spell effects are not implemented here.
        return targetZoneId === "trash";
      case "gear":
        // Core Rules 145-148: gear enters base; TODO(Core Rules 421-422, 716-725): implement attachment rules separately.
        return targetZoneId === "base";
      case "rune":
      case "battlefield":
      case "champion":
        // Core Rules 103-109 and 156-164: these cards are handled by setup/rune systems, not normal hand play.
        return false;
    }
  }

  private validatePlayerDeck(playerConfig: PlayerSetupConfig) {
    const errors: DeckValidationError[] = [];

    // Core Rules 101-103: main deck must contain at least 40 cards.
    if (playerConfig.mainDeck.length < MAIN_DECK_MINIMUM_SIZE) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "101-103",
        code: "MAIN_DECK_TOO_SMALL",
        message: `Main deck must contain at least ${MAIN_DECK_MINIMUM_SIZE} cards.`,
      });
    }

    // Core Rules 101-103: main deck is built from main-deck card categories, not runes or battlefields.
    const invalidMainDeckCards = playerConfig.mainDeck.filter(
      (card) => card.kind === "rune" || card.kind === "battlefield",
    );

    if (invalidMainDeckCards.length > 0) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "101-103",
        code: "INVALID_MAIN_DECK_CARD_KIND",
        message: "Main deck cannot contain rune or battlefield cards.",
      });
    }

    // Core Rules 103.3: rune deck must contain exactly 12 rune cards.
    if (playerConfig.runeDeck.length !== RUNE_DECK_SIZE) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "103.3",
        code: "INVALID_RUNE_DECK_SIZE",
        message: `Rune deck must contain exactly ${RUNE_DECK_SIZE} cards.`,
      });
    }

    const nonRuneCards = playerConfig.runeDeck.filter((card) => card.kind !== "rune");

    if (nonRuneCards.length > 0) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "103.3",
        code: "INVALID_RUNE_DECK_CARD_KIND",
        message: "Rune deck can contain only rune cards.",
      });
    }

    // Core Rules 101-103: the chosen champion must match the champion identity established by the champion legend.
    if (!this.isChampionCard(playerConfig.chosenChampion)) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "101-103",
        code: "INVALID_CHOSEN_CHAMPION",
        message: "Chosen champion must be a champion card.",
      });
    }

    if (!this.chosenChampionMatchesLegend(playerConfig)) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "101-103",
        code: "CHOSEN_CHAMPION_DOES_NOT_MATCH_LEGEND",
        message: "Chosen champion must match the champion tag of the champion legend.",
      });
    }

    // Core Rules 101-103: main-deck domains must fit within the champion legend domain identity.
    const legendDomains = playerConfig.championLegend.domains ?? [];
    const outOfIdentityCards = playerConfig.mainDeck.filter((card) => {
      const cardDomains = card.domains ?? [];

      return (
        cardDomains.length > 0 &&
        legendDomains.length > 0 &&
        cardDomains.some((domain) => !legendDomains.includes(domain))
      );
    });

    if (outOfIdentityCards.length > 0) {
      errors.push({
        playerId: playerConfig.playerId,
        ruleSection: "101-103",
        code: "CARD_OUTSIDE_DOMAIN_IDENTITY",
        message: "Main deck contains cards outside the champion legend domain identity.",
      });
    }

    for (const copyLimitError of this.validateCopyLimits(playerConfig)) {
      errors.push(copyLimitError);
    }

    return errors;
  }

  private validateCopyLimits(playerConfig: PlayerSetupConfig) {
    const errors: DeckValidationError[] = [];
    const copyCounts = new Map<string, { card: GameCard; count: number }>();

    // Core Rules 101-103: the chosen champion counts toward named-card copy limits.
    for (const card of [...playerConfig.mainDeck, playerConfig.chosenChampion]) {
      const copyKey = this.getCopyLimitKey(card);
      const current = copyCounts.get(copyKey);

      copyCounts.set(copyKey, {
        card,
        count: (current?.count ?? 0) + 1,
      });
    }

    for (const copyCount of copyCounts.values()) {
      const maxCopies = copyCount.card.maxCopies ?? DEFAULT_MAIN_DECK_COPY_LIMIT;

      if (copyCount.count > maxCopies) {
        errors.push({
          playerId: playerConfig.playerId,
          ruleSection: "101-103",
          code: "TOO_MANY_COPIES",
          message: `${copyCount.card.name} exceeds the ${maxCopies}-copy deck construction limit.`,
        });
      }
    }

    // TODO(Core Rules 101-103): enforce dedicated signature-card limits once official card metadata exposes signature tags separately from maxCopies.
    return errors;
  }

  private isChampionCard(card: GameCard) {
    return (
      card.kind === "champion" ||
      card.supertype?.toLowerCase() === "champion" ||
      card.tags?.some((tag) => tag.toLowerCase() === card.name.toLowerCase()) === true
    );
  }

  private chosenChampionMatchesLegend(playerConfig: PlayerSetupConfig) {
    const legendTags = playerConfig.championLegend.tags ?? [];
    const championTags = playerConfig.chosenChampion.tags ?? [];

    // TODO(Core Rules 101-103): replace tag-overlap fallback with the official champion-tag field if imported data exposes it.
    if (legendTags.length === 0 || championTags.length === 0) {
      return true;
    }

    return championTags.some((tag) => legendTags.includes(tag));
  }

  private getCopyLimitKey(card: GameCard) {
    return card.cardDefinitionId ?? card.name;
  }

  private getPlayerOrder(config: GameSetupConfig) {
    const playerIds = config.players.map((player) => player.playerId);

    // Core Rules 115: setup determines turn order before mulligans.
    if (config.playerOrder?.length) {
      const orderedPlayerIds = config.playerOrder.filter((playerId) =>
        playerIds.includes(playerId),
      );
      const missingPlayerIds = playerIds.filter(
        (playerId) => !orderedPlayerIds.includes(playerId),
      );

      return [...orderedPlayerIds, ...missingPlayerIds];
    }

    if (config.firstPlayerId && playerIds.includes(config.firstPlayerId)) {
      const firstPlayerIndex = playerIds.indexOf(config.firstPlayerId);

      return [
        ...playerIds.slice(firstPlayerIndex),
        ...playerIds.slice(0, firstPlayerIndex),
      ];
    }

    // TODO(Core Rules 115): replace caller-provided/default first-player selection with the official random/manual choice flow for each mode.
    return playerIds;
  }

  private shuffleCards(cards: GameCard[], rng: () => number) {
    const shuffledCards = [...cards];

    for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(rng() * (index + 1));
      [shuffledCards[index], shuffledCards[swapIndex]] = [
        shuffledCards[swapIndex],
        shuffledCards[index],
      ];
    }

    return shuffledCards;
  }
}
