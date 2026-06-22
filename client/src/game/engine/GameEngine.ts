import type { GameCard } from "../../data/cards";
import type { AbilityEngine } from "../abilities/AbilityEngine";
import type {
  DeckValidationError,
  DropZoneId,
  GameState,
  PlayerState,
  ZoneId,
} from "../gameState";
import { createInitialGameState, emptyZones, TurnPhase } from "../gameState";
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
    this.emit({
      type: "MulliganStarted",
      playerIds: playerOrder,
    });

    return {
      ok: true,
      errors: [],
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

  playCard(playerId: string, cardInstanceId: string, zoneId: ZoneId) {
    const moved = this.moveCardToZone(cardInstanceId, zoneId);

    if (moved) {
      this.emit({
        type: "CardPlayed",
        playerId,
        cardInstanceId,
        zoneId,
      });
    }
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
    this.state = TurnManager.endTurn(this.state);
    this.emit({
      type: "TurnEnded",
      activePlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.turnNumber,
    });
  }

  nextPhase() {
    const result = TurnController.nextPhase(this.state);
    this.state = result.state;

    this.emit({
      type: "PhaseChanged",
      phase: this.state.turn.phase,
      activePlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.turnNumber,
    });

    if (result.drawnCard) {
      this.emit({
        type: "CardDrawn",
        playerId: this.state.turn.activePlayerId,
        card: result.drawnCard,
      });
    }

    if (this.state.turn.phase === "END") {
      this.emit({
        type: "TurnEnded",
        activePlayerId: this.state.turn.activePlayerId,
        turnNumber: this.state.turn.turnNumber,
      });
    }
  }

  nextTurn() {
    this.state = TurnController.nextTurn(this.state);

    this.emit({
      type: "PhaseChanged",
      phase: this.state.turn.phase,
      activePlayerId: this.state.turn.activePlayerId,
      turnNumber: this.state.turn.turnNumber,
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
