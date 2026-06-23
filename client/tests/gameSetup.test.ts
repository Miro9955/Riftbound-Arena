import { describe, expect, it } from "vitest";
import type { GameCard } from "../src/data/cards";
import { GameEngine } from "../src/game/engine/GameEngine";
import type { PlayerSetupConfig } from "../src/game/engine/GameEngine";
import { TurnPhase } from "../src/game/gameState";
import { collectGameEvents, createMockCard } from "./helpers/mockGame";

function createSetupCard(index: number, overrides: Partial<GameCard> = {}) {
  return createMockCard({
    id: `setup-card-${index}`,
    cardDefinitionId: `setup-definition-${index}`,
    name: `Setup Card ${index}`,
    domains: ["Order"],
    tags: [],
    ...overrides,
  });
}

function createMainDeck(size = 40, overrides: Partial<GameCard> = {}) {
  return Array.from({ length: size }, (_, index) =>
    createSetupCard(index, {
      ...overrides,
      id: `${overrides.id ?? "main"}-${index}`,
      cardDefinitionId: `${overrides.cardDefinitionId ?? "main-definition"}-${index}`,
      name: `${overrides.name ?? "Main Card"} ${index}`,
    }),
  );
}

function createRuneDeck(size = 12, overrides: Partial<GameCard> = {}) {
  return Array.from({ length: size }, (_, index) =>
    createSetupCard(index, {
      kind: "rune",
      cost: 0,
      power: 0,
      health: 0,
      domains: ["Order"],
      ...overrides,
      id: `${overrides.id ?? "rune"}-${index}`,
      cardDefinitionId: `${overrides.cardDefinitionId ?? "rune-definition"}-${index}`,
      name: `${overrides.name ?? "Rune Card"} ${index}`,
    }),
  );
}

function createChampionLegend(overrides: Partial<GameCard> = {}) {
  return createSetupCard(1000, {
    id: "legend-lux",
    cardDefinitionId: "legend-lux",
    name: "Lux Legend",
    kind: "champion",
    supertype: "Champion",
    domains: ["Order", "Mind"],
    tags: ["Lux"],
    ...overrides,
  });
}

function createChosenChampion(overrides: Partial<GameCard> = {}) {
  return createSetupCard(1001, {
    id: "chosen-lux",
    cardDefinitionId: "chosen-lux",
    name: "Lux",
    kind: "unit",
    supertype: "Champion",
    domains: ["Order"],
    tags: ["Lux"],
    ...overrides,
  });
}

function createPlayerSetup(overrides: Partial<PlayerSetupConfig> = {}): PlayerSetupConfig {
  return {
    playerId: overrides.playerId ?? "player1",
    championLegend: overrides.championLegend ?? createChampionLegend(),
    chosenChampion: overrides.chosenChampion ?? createChosenChampion(),
    mainDeck: overrides.mainDeck ?? createMainDeck(),
    runeDeck: overrides.runeDeck ?? createRuneDeck(),
  };
}

describe("Game setup rules", () => {
  it("validates the official minimum main deck size", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        mainDeck: createMainDeck(39),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "101-103",
        code: "MAIN_DECK_TOO_SMALL",
      }),
    );
  });

  it("rejects rune and battlefield cards in the main deck", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        mainDeck: [
          ...createMainDeck(38),
          createSetupCard(2000, { kind: "rune" }),
          createSetupCard(2001, { kind: "battlefield" }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "101-103",
        code: "INVALID_MAIN_DECK_CARD_KIND",
      }),
    );
  });

  it("validates the official rune deck size", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        runeDeck: createRuneDeck(11),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "103.3",
        code: "INVALID_RUNE_DECK_SIZE",
      }),
    );
  });

  it("rejects non-rune cards in the rune deck", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        runeDeck: [...createRuneDeck(11), createSetupCard(3000, { kind: "unit" })],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "103.3",
        code: "INVALID_RUNE_DECK_CARD_KIND",
      }),
    );
  });

  it("validates the chosen champion requirement", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        chosenChampion: createChosenChampion({
          name: "Not A Champion",
          kind: "unit",
          supertype: null,
          tags: ["Lux"],
        }),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "101-103",
        code: "INVALID_CHOSEN_CHAMPION",
      }),
    );
  });

  it("validates that the chosen champion matches the champion legend tag", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        chosenChampion: createChosenChampion({
          name: "Jinx",
          tags: ["Jinx"],
        }),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "101-103",
        code: "CHOSEN_CHAMPION_DOES_NOT_MATCH_LEGEND",
      }),
    );
  });

  it("validates domain identity against the champion legend", () => {
    const engine = new GameEngine();
    const result = engine.validateDeck(
      createPlayerSetup({
        mainDeck: [
          ...createMainDeck(39),
          createSetupCard(4000, {
            domains: ["Fury"],
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "101-103",
        code: "CARD_OUTSIDE_DOMAIN_IDENTITY",
      }),
    );
  });

  it("validates named card copy limits and counts the chosen champion", () => {
    const engine = new GameEngine();
    const repeatedChampion = createChosenChampion({
      id: "lux-copy-0",
      cardDefinitionId: "lux-card",
      maxCopies: 3,
    });
    const mainDeck = [
      ...createMainDeck(37),
      createChosenChampion({
        id: "lux-copy-1",
        cardDefinitionId: "lux-card",
        maxCopies: 3,
      }),
      createChosenChampion({
        id: "lux-copy-2",
        cardDefinitionId: "lux-card",
        maxCopies: 3,
      }),
      createChosenChampion({
        id: "lux-copy-3",
        cardDefinitionId: "lux-card",
        maxCopies: 3,
      }),
    ];

    const result = engine.validateDeck(
      createPlayerSetup({
        chosenChampion: repeatedChampion,
        mainDeck,
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        ruleSection: "101-103",
        code: "TOO_MANY_COPIES",
      }),
    );
  });

  it("emits deck validation events", () => {
    const engine = new GameEngine();
    const { events } = collectGameEvents(engine);

    engine.validateDeck(createPlayerSetup());
    engine.validateDeck(
      createPlayerSetup({
        playerId: "player2",
        mainDeck: createMainDeck(39),
      }),
    );

    expect(events[0]).toEqual({
      type: "DeckValidated",
      playerId: "player1",
    });
    expect(events[1]).toEqual(
      expect.objectContaining({
        type: "DeckRejected",
        playerId: "player2",
      }),
    );
  });

  it("creates starting game state, shuffles decks, draws starting hands, and prepares mulligans", () => {
    const engine = new GameEngine();
    const player1 = createPlayerSetup();
    const player2 = createPlayerSetup({
      playerId: "player2",
      championLegend: createChampionLegend({
        id: "legend-jinx",
        name: "Jinx Legend",
        domains: ["Fury", "Chaos"],
        tags: ["Jinx"],
      }),
      chosenChampion: createChosenChampion({
        id: "chosen-jinx",
        name: "Jinx",
        domains: ["Fury"],
        tags: ["Jinx"],
      }),
      mainDeck: createMainDeck(40, { id: "p2-main", domains: ["Fury"] }),
      runeDeck: createRuneDeck(12, { id: "p2-rune", domains: ["Fury"] }),
    });
    const { events } = collectGameEvents(engine);

    const result = engine.startGameSetup({
      players: [player1, player2],
      firstPlayerId: "player2",
      rng: () => 0,
    });

    expect(result.ok).toBe(true);
    expect(engine.getState().turn).toEqual({
      activePlayerId: "player2",
      turnNumber: 1,
      phase: TurnPhase.MULLIGAN,
      playerOrder: ["player2", "player1"],
    });
    expect(engine.getState().setup).toEqual({
      status: "MULLIGAN_PENDING",
      decksValidated: true,
      firstPlayerId: "player2",
      mulliganPlayerIds: ["player2", "player1"],
      currentMulliganPlayerId: "player2",
      completedMulliganPlayerIds: [],
      mulliganSetAsideCards: {},
      mulliganComplete: false,
      startOfGameCompletedPlayerIds: [],
      validationErrors: [],
    });
    expect(engine.getState().players.player1.hand).toHaveLength(4);
    expect(engine.getState().players.player1.deck).toHaveLength(36);
    expect(engine.getState().players.player1.runeDeck).toHaveLength(12);
    expect(engine.getState().players.player1.setup).toEqual({
      deckValidated: true,
      startingHandDrawn: true,
      mulliganPending: true,
      mulliganCompleted: false,
    });
    expect(engine.getState().hand).toEqual(engine.getState().players.player2.hand);
    expect(engine.getState().players.player1.hand.map((card) => card.id)).not.toEqual(
      player1.mainDeck.slice(0, 4).map((card) => card.id),
    );
    expect(events.map((event) => event.type)).toEqual([
      "GameSetupStarted",
      "DeckValidated",
      "DeckValidated",
      "DeckShuffled",
      "DeckShuffled",
      "StartingHandDrawn",
      "CardDrawn",
      "CardDrawn",
      "CardDrawn",
      "CardDrawn",
      "DeckShuffled",
      "DeckShuffled",
      "StartingHandDrawn",
      "CardDrawn",
      "CardDrawn",
      "CardDrawn",
      "CardDrawn",
      "TurnOrderDetermined",
      "MulliganStarted",
    ]);
  });

  it("allows a player to mulligan 0 cards", () => {
    const engine = new GameEngine();

    engine.startGameSetup({
      players: [createPlayerSetup()],
      rng: () => 0,
    });

    const startingHandIds = engine
      .getState()
      .players.player1.hand.map((card) => card.id);

    engine.chooseMulliganCards("player1", []);
    engine.resolveMulligan("player1");

    expect(engine.getState().players.player1.hand.map((card) => card.id)).toEqual(
      startingHandIds,
    );
    expect(engine.getState().players.player1.deck).toHaveLength(36);
    expect(engine.getState().players.player1.setup.mulliganCompleted).toBe(true);
  });

  it("allows a player to mulligan 1 card", () => {
    const engine = new GameEngine();

    engine.startGameSetup({
      players: [createPlayerSetup()],
      rng: () => 0,
    });

    const selectedCard = engine.getState().players.player1.hand[0];
    const replacementCard = engine.getState().players.player1.deck[0];

    engine.chooseMulliganCards("player1", [selectedCard.id]);
    engine.resolveMulligan("player1");

    const player = engine.getState().players.player1;

    expect(player.hand).toHaveLength(4);
    expect(player.hand).toContainEqual(replacementCard);
    expect(player.hand).not.toContainEqual(selectedCard);
    expect(player.deck.at(-1)).toEqual(selectedCard);
  });

  it("allows a player to mulligan 2 cards", () => {
    const engine = new GameEngine();

    engine.startGameSetup({
      players: [createPlayerSetup()],
      rng: () => 0,
    });

    const selectedCards = engine.getState().players.player1.hand.slice(0, 2);
    const replacementCards = engine.getState().players.player1.deck.slice(0, 2);

    engine.chooseMulliganCards(
      "player1",
      selectedCards.map((card) => card.id),
    );
    engine.resolveMulligan("player1");

    const player = engine.getState().players.player1;

    expect(player.hand).toHaveLength(4);
    expect(player.hand).toEqual(expect.arrayContaining(replacementCards));
    expect(player.hand).not.toEqual(expect.arrayContaining(selectedCards));
    expect(player.deck.slice(-2)).toEqual(selectedCards);
  });

  it("does not allow a player to mulligan 3 cards", () => {
    const engine = new GameEngine();

    engine.startGameSetup({
      players: [createPlayerSetup()],
      rng: () => 0,
    });

    const selectedCardIds = engine
      .getState()
      .players.player1.hand.slice(0, 3)
      .map((card) => card.id);

    expect(() => {
      engine.chooseMulliganCards("player1", selectedCardIds);
    }).toThrow("A player may not choose more than 2 cards for mulligan.");

    expect(engine.getState().setup.mulliganSetAsideCards.player1).toBeUndefined();
  });

  it("draws replacement cards before recycling set-aside cards", () => {
    const engine = new GameEngine();
    const { events } = collectGameEvents(engine);

    engine.startGameSetup({
      players: [createPlayerSetup()],
      rng: () => 0,
    });

    const selectedCard = engine.getState().players.player1.hand[0];
    const replacementCard = engine.getState().players.player1.deck[0];

    engine.chooseMulliganCards("player1", [selectedCard.id]);
    engine.resolveMulligan("player1");

    const drawEventIndex = events.findIndex(
      (event) => event.type === "CardDrawn" && event.card.id === replacementCard.id,
    );
    const recycleEventIndex = events.findIndex(
      (event) => event.type === "CardsRecycled",
    );

    expect(drawEventIndex).toBeGreaterThan(-1);
    expect(recycleEventIndex).toBeGreaterThan(drawEventIndex);
    expect(engine.getState().players.player1.hand).toContainEqual(replacementCard);
    expect(engine.getState().players.player1.deck.at(-1)).toEqual(selectedCard);
  });

  it("proceeds through mulligan decisions in turn order", () => {
    const engine = new GameEngine();
    const player1 = createPlayerSetup();
    const player2 = createPlayerSetup({
      playerId: "player2",
      championLegend: createChampionLegend({
        id: "legend-jinx",
        name: "Jinx Legend",
        domains: ["Fury"],
        tags: ["Jinx"],
      }),
      chosenChampion: createChosenChampion({
        id: "chosen-jinx",
        name: "Jinx",
        domains: ["Fury"],
        tags: ["Jinx"],
      }),
      mainDeck: createMainDeck(40, { id: "p2-main", domains: ["Fury"] }),
      runeDeck: createRuneDeck(12, { id: "p2-rune", domains: ["Fury"] }),
    });

    engine.startGameSetup({
      players: [player1, player2],
      firstPlayerId: "player2",
      rng: () => 0,
    });

    expect(engine.getState().setup.currentMulliganPlayerId).toBe("player2");
    expect(() => {
      engine.chooseMulliganCards("player1", []);
    }).toThrow("Mulligan decisions must proceed in turn order.");

    engine.chooseMulliganCards("player2", []);
    engine.resolveMulligan("player2");

    expect(engine.getState().setup.currentMulliganPlayerId).toBe("player1");
  });

  it("completes mulligan when all players are done", () => {
    const engine = new GameEngine();
    const player1 = createPlayerSetup();
    const player2 = createPlayerSetup({
      playerId: "player2",
      championLegend: createChampionLegend({
        id: "legend-jinx",
        name: "Jinx Legend",
        domains: ["Fury"],
        tags: ["Jinx"],
      }),
      chosenChampion: createChosenChampion({
        id: "chosen-jinx",
        name: "Jinx",
        domains: ["Fury"],
        tags: ["Jinx"],
      }),
      mainDeck: createMainDeck(40, { id: "p2-main", domains: ["Fury"] }),
      runeDeck: createRuneDeck(12, { id: "p2-rune", domains: ["Fury"] }),
    });

    engine.startGameSetup({
      players: [player1, player2],
      firstPlayerId: "player2",
      rng: () => 0,
    });

    engine.chooseMulliganCards("player2", []);
    engine.resolveMulligan("player2");
    engine.chooseMulliganCards("player1", []);
    engine.resolveMulligan("player1");

    expect(engine.getState().setup.currentMulliganPlayerId).toBeUndefined();
    expect(engine.getState().setup.completedMulliganPlayerIds).toEqual([
      "player2",
      "player1",
    ]);
    expect(engine.getState().setup.mulliganComplete).toBe(true);
    expect(engine.getState().setup.startOfGameCompletedPlayerIds).toEqual([
      "player2",
      "player1",
    ]);
    expect(engine.getState().players.player1.hasMulliganed).toBe(true);
    expect(engine.getState().players.player2.hasMulliganed).toBe(true);
  });

  it("rejects setup before mutating into a started setup state", () => {
    const engine = new GameEngine();
    const { events } = collectGameEvents(engine);

    const result = engine.startGameSetup({
      players: [
        createPlayerSetup({
          mainDeck: createMainDeck(39),
        }),
      ],
    });

    expect(result.ok).toBe(false);
    expect(engine.getState().setup.status).toBe("VALIDATING_DECKS");
    expect(engine.getState().setup.decksValidated).toBe(false);
    expect(engine.getState().setup.validationErrors).toContainEqual(
      expect.objectContaining({ code: "MAIN_DECK_TOO_SMALL" }),
    );
    expect(events.map((event) => event.type)).toEqual([
      "GameSetupStarted",
      "DeckRejected",
    ]);
  });
});
