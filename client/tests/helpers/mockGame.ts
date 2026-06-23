import type { GameCard } from "../../src/data/cards";
import type { GameEvent, GameEventListener } from "../../src/game/engine/GameEvents";
import { GameEngine } from "../../src/game/engine/GameEngine";
import type { GameState, PlayerState, ZoneId } from "../../src/game/gameState";
import { emptyBattlefields, emptyZones, TurnPhase } from "../../src/game/gameState";

export function createMockCard(overrides: Partial<GameCard> = {}): GameCard {
  return {
    id: overrides.id ?? "mock-card",
    cardDefinitionId: overrides.cardDefinitionId,
    name: overrides.name ?? "Mock Card",
    kind: overrides.kind ?? "unit",
    supertype: overrides.supertype,
    cost: overrides.cost ?? 1,
    power: overrides.power ?? 1,
    health: overrides.health ?? 1,
    text: overrides.text ?? "Mock card text.",
    color: overrides.color ?? "gold",
    domains: overrides.domains,
    tags: overrides.tags,
    maxCopies: overrides.maxCopies,
    imageUrl: overrides.imageUrl,
  };
}

export function createMockPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    deck: overrides.deck ?? [],
    runeDeck: overrides.runeDeck ?? [],
    channeledRunes: overrides.channeledRunes ?? [],
    exhaustedRuneIds: overrides.exhaustedRuneIds ?? [],
    runePool: overrides.runePool ?? {
      available: 0,
      spent: 0,
    },
    hand: overrides.hand ?? [],
    trash: overrides.trash ?? [],
    banishment: overrides.banishment ?? [],
    base: overrides.base ?? [],
    championLegend: overrides.championLegend,
    chosenChampion: overrides.chosenChampion,
    setup: overrides.setup ?? {
      deckValidated: false,
      startingHandDrawn: false,
      mulliganPending: false,
      mulliganCompleted: false,
    },
    hasMulliganed: overrides.hasMulliganed ?? false,
    hasDrawn: overrides.hasDrawn ?? false,
    actionsRemaining: overrides.actionsRemaining ?? 1,
  };
}

export function createMockGame(overrides: Partial<GameState> = {}): GameState {
  return {
    hand: overrides.hand ?? [],
    zones: {
      ...emptyZones(),
      ...overrides.zones,
    },
    battlefields: {
      ...emptyBattlefields(),
      ...overrides.battlefields,
    },
    unitDamage: overrides.unitDamage ?? {},
    exhaustedUnitIds: overrides.exhaustedUnitIds ?? [],
    scores: overrides.scores ?? {
      player1: 0,
    },
    game: overrides.game ?? {
      gameOver: false,
      winningPlayerIds: [],
      victoryScore: 8,
    },
    players: overrides.players ?? {
      player1: createMockPlayer(),
    },
    turn: overrides.turn ?? {
      activePlayerId: "player1",
      turnNumber: 1,
      phase: TurnPhase.GAME_START,
      playerOrder: ["player1"],
    },
    setup: overrides.setup ?? {
      status: "NOT_STARTED",
      decksValidated: false,
      mulliganPlayerIds: [],
      completedMulliganPlayerIds: [],
      mulliganSetAsideCards: {},
      mulliganComplete: false,
      startOfGameCompletedPlayerIds: [],
      validationErrors: [],
    },
  };
}

export function createMockEngine(overrides: Partial<GameState> = {}) {
  return new GameEngine(createMockGame(overrides));
}

export function collectGameEvents(engine: GameEngine) {
  const events: GameEvent[] = [];
  const listener: GameEventListener = (event) => {
    events.push(event);
  };

  const unsubscribe = engine.subscribe(listener);

  return {
    events,
    unsubscribe,
  };
}

export function createZoneState(zoneId: ZoneId, cards: GameCard[]) {
  return {
    ...emptyZones(),
    [zoneId]: cards,
  };
}
