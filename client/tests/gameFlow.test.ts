import { describe, expect, it } from "vitest";
import type { GameCard } from "../src/data/cards";
import { GameEngine } from "../src/game/engine/GameEngine";
import type { PlayerSetupConfig } from "../src/game/engine/GameEngine";
import { TurnPhase } from "../src/game/gameState";
import { collectGameEvents, createMockCard } from "./helpers/mockGame";

function createFlowCard(index: number, overrides: Partial<GameCard> = {}) {
  return createMockCard({
    id: `flow-card-${index}`,
    cardDefinitionId: `flow-definition-${index}`,
    name: `Flow Card ${index}`,
    cost: 0,
    domains: ["Order"],
    tags: [],
    ...overrides,
  });
}

function createMainDeck(cards: GameCard[] = []) {
  const fillerCount = Math.max(0, 40 - cards.length);
  const fillerCards = Array.from({ length: fillerCount }, (_, index) =>
    createFlowCard(1000 + index, {
      id: `flow-main-${index}`,
      cardDefinitionId: `flow-main-definition-${index}`,
      name: `Flow Main ${index}`,
    }),
  );

  return [...cards, ...fillerCards];
}

function withDomains(cards: GameCard[], domains: string[]) {
  return cards.map((card) => ({
    ...card,
    domains,
  }));
}

function createRuneDeck() {
  return Array.from({ length: 12 }, (_, index) =>
    createFlowCard(2000 + index, {
      id: `flow-rune-${index}`,
      cardDefinitionId: `flow-rune-definition-${index}`,
      name: `Flow Rune ${index}`,
      kind: "rune",
      cost: 0,
      power: 0,
      health: 0,
    }),
  );
}

function createChampionLegend(overrides: Partial<GameCard> = {}) {
  return createFlowCard(3000, {
    id: "flow-legend-lux",
    cardDefinitionId: "flow-legend-lux",
    name: "Lux Legend",
    kind: "champion",
    supertype: "Champion",
    domains: ["Order"],
    tags: ["Lux"],
    ...overrides,
  });
}

function createChosenChampion(overrides: Partial<GameCard> = {}) {
  return createFlowCard(3001, {
    id: "flow-chosen-lux",
    cardDefinitionId: "flow-chosen-lux",
    name: "Lux",
    kind: "unit",
    supertype: "Champion",
    domains: ["Order"],
    tags: ["Lux"],
    ...overrides,
  });
}

function createPlayerSetup(
  playerId: string,
  mainDeck: GameCard[],
  overrides: Partial<PlayerSetupConfig> = {},
): PlayerSetupConfig {
  return {
    playerId,
    championLegend: overrides.championLegend ?? createChampionLegend(),
    chosenChampion: overrides.chosenChampion ?? createChosenChampion(),
    mainDeck,
    runeDeck: overrides.runeDeck ?? createRuneDeck(),
  };
}

function createStartedEngine() {
  const playableUnit = createFlowCard(1, {
    id: "flow-playable-unit",
    name: "Flow Vanguard",
    kind: "unit",
    cost: 1,
    power: 2,
    health: 3,
  });
  const defender = createFlowCard(2, {
    id: "flow-defender",
    name: "Flow Defender",
    kind: "unit",
    cost: 0,
    power: 1,
    health: 2,
  });
  const engine = new GameEngine();

  engine.startGameSetup({
    players: [
      createPlayerSetup("player1", createMainDeck([playableUnit])),
      createPlayerSetup("player2", withDomains(createMainDeck([defender]), ["Fury"]), {
        championLegend: createChampionLegend({
          id: "flow-legend-jinx",
          name: "Jinx Legend",
          domains: ["Fury"],
          tags: ["Jinx"],
        }),
        chosenChampion: createChosenChampion({
          id: "flow-chosen-jinx",
          name: "Jinx",
          domains: ["Fury"],
          tags: ["Jinx"],
        }),
        runeDeck: createRuneDeck().map((rune) => ({
          ...rune,
          domains: ["Fury"],
        })),
      }),
    ],
    firstPlayerId: "player1",
    rng: () => 0.999,
  });
  engine.chooseMulliganCards("player1", []);
  engine.resolveMulligan("player1");
  engine.chooseMulliganCards("player2", []);
  engine.resolveMulligan("player2");
  engine.nextPhase();

  return {
    engine,
    playableUnit,
    defender,
  };
}

function advanceToMainPhase(engine: GameEngine) {
  engine.nextPhase();
  engine.nextPhase();
}

describe("Game flow integration", () => {
  it("runs a realistic minimal game flow across implemented systems", () => {
    const { engine, playableUnit, defender } = createStartedEngine();
    const { events } = collectGameEvents(engine);

    expect(engine.getState().turn.phase).toBe(TurnPhase.TURN_START);

    advanceToMainPhase(engine);
    expect(engine.getState().turn.phase).toBe(TurnPhase.MAIN);

    const rune = engine.drawRune("player1");
    expect(rune).toBeDefined();
    engine.channelRune("player1", rune!.id);

    expect(engine.playCard("player1", playableUnit.id, "base")).toBe(true);
    expect(engine.moveUnit("player1", playableUnit.id, "battlefield1")).toBe(true);
    expect(engine.getBattlefieldController("battlefield1")).toBe("player1");
    expect(engine.declareAttack("player1", playableUnit.id, "battlefield1")).toBe(true);

    engine.setState({
      ...engine.getState(),
      zones: {
        ...engine.getState().zones,
        battlefield1: [...engine.getState().zones.battlefield1, defender],
      },
      battlefields: {
        ...engine.getState().battlefields,
        battlefield1: {
          ...engine.getState().battlefields.battlefield1,
          unitControllers: {
            ...engine.getState().battlefields.battlefield1.unitControllers,
            [defender.id]: "player2",
          },
        },
      },
    });

    expect(engine.dealDamage(playableUnit.id, defender.id, 2)).toBe(true);
    expect(engine.getState().zones.trash).toContainEqual(defender);

    engine.scoreBattlefieldControl();
    expect(engine.getPlayerScore("player1")).toBe(1);
    engine.addScore("player1", 7, "integration-threshold");
    expect(engine.getState().game.gameOver).toBe(true);
    expect(engine.getState().game.winnerId).toBe("player1");

    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "PhaseChanged",
        "CardDrawn",
        "RuneDrawn",
        "RuneChanneled",
        "RuneSpent",
        "CardPlayed",
        "UnitMoved",
        "AttackDeclared",
        "DamageDealt",
        "UnitDestroyed",
        "ScoreChanged",
        "VictoryAchieved",
        "GameEnded",
      ]),
    );
  });

  it("integrates setup, mulligan, and first turn entry", () => {
    const { engine } = createStartedEngine();

    expect(engine.getState().setup.mulliganComplete).toBe(true);
    expect(engine.getState().setup.status).toBe("COMPLETE");
    expect(engine.getState().turn).toEqual({
      activePlayerId: "player1",
      turnNumber: 1,
      phase: TurnPhase.TURN_START,
      playerOrder: ["player1", "player2"],
    });
  });

  it("integrates main phase rune spend and card play", () => {
    const { engine, playableUnit } = createStartedEngine();

    advanceToMainPhase(engine);
    const rune = engine.drawRune("player1");
    engine.channelRune("player1", rune!.id);

    expect(engine.playCard("player1", playableUnit.id, "base")).toBe(true);
    expect(engine.getState().players.player1.runePool).toEqual({
      available: 0,
      spent: 1,
    });
    expect(engine.getState().players.player1.base).toEqual([playableUnit]);
  });

  it("integrates playing a unit, moving it, and battlefield control", () => {
    const { engine, playableUnit } = createStartedEngine();

    advanceToMainPhase(engine);
    const rune = engine.drawRune("player1");
    engine.channelRune("player1", rune!.id);
    engine.playCard("player1", playableUnit.id, "base");
    engine.moveUnit("player1", playableUnit.id, "battlefield1");

    expect(engine.getUnitsAtBattlefield("battlefield1")).toEqual([playableUnit]);
    expect(engine.getBattlefieldController("battlefield1")).toBe("player1");
  });

  it("integrates battlefield control into score changes", () => {
    const { engine, playableUnit } = createStartedEngine();

    advanceToMainPhase(engine);
    const rune = engine.drawRune("player1");
    engine.channelRune("player1", rune!.id);
    engine.playCard("player1", playableUnit.id, "base");
    engine.moveUnit("player1", playableUnit.id, "battlefield1");

    expect(engine.scoreBattlefieldControl()).toEqual(["battlefield1"]);
    expect(engine.getPlayerScore("player1")).toBe(1);
  });

  it("integrates score threshold into game over", () => {
    const { engine } = createStartedEngine();

    engine.addScore("player1", 8, "integration-victory");

    expect(engine.checkVictory()).toBe(true);
    expect(engine.getState().game).toEqual({
      gameOver: true,
      winnerId: "player1",
      winningPlayerIds: ["player1"],
      victoryScore: 8,
    });
  });
});
