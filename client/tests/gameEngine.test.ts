import { describe, expect, it } from "vitest";
import { TurnPhase } from "../src/game/gameState";
import {
  collectGameEvents,
  createMockCard,
  createMockEngine,
  createMockGame,
  createMockPlayer,
  createZoneState,
} from "./helpers/mockGame";
import { GameEngine } from "../src/game/engine/GameEngine";

describe("GameEngine", () => {
  it("sets an initial hand and clears zones", () => {
    const handCard = createMockCard({ id: "hand-card" });
    const zoneCard = createMockCard({ id: "zone-card" });
    const engine = createMockEngine({
      zones: createZoneState("battlefield1", [zoneCard]),
    });

    engine.setInitialHand([handCard]);

    expect(engine.getState().hand).toEqual([handCard]);
    expect(engine.getState().zones.battlefield1).toEqual([]);
  });

  it("draws the top card from a player deck into hand", () => {
    const topCard = createMockCard({ id: "top-card" });
    const nextCard = createMockCard({ id: "next-card" });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ deck: [topCard, nextCard] }),
      },
    });
    const { events } = collectGameEvents(engine);

    engine.drawCard("player1");

    expect(engine.getState().hand).toEqual([topCard]);
    expect(engine.getState().players.player1.deck).toEqual([nextCard]);
    expect(engine.getState().players.player1.hasDrawn).toBe(true);
    expect(events).toEqual([
      {
        type: "CardDrawn",
        playerId: "player1",
        card: topCard,
      },
    ]);
  });

  it("does not emit CardDrawn when drawing from an empty or missing deck", () => {
    const engine = createMockEngine();
    const { events } = collectGameEvents(engine);

    engine.drawCard("player1");
    engine.drawCard("missing-player");

    expect(engine.getState().hand).toEqual([]);
    expect(events).toEqual([]);
  });

  it("plays a hand card into a zone", () => {
    const card = createMockCard({ id: "playable-card", cost: 0 });
    const engine = createMockEngine({
      hand: [card],
      players: {
        player1: createMockPlayer({ hand: [card] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.playCard("player1", card.id, "battlefield1");

    expect(engine.getState().hand).toEqual([]);
    expect(engine.getState().players.player1.hand).toEqual([]);
    expect(engine.getState().zones.battlefield1).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "battlefield1",
      },
      {
        type: "CardPlayed",
        playerId: "player1",
        cardInstanceId: card.id,
        zoneId: "battlefield1",
      },
    ]);
  });

  it("does not play an opponent card", () => {
    const card = createMockCard({ id: "opponent-card", cost: 0 });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer(),
        player2: createMockPlayer({ hand: [card] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1", "player2"],
      },
    });

    expect(engine.canPlayCard("player1", card.id, "battlefield1")).toBe(false);
    expect(engine.validatePlayCard("player1", card.id, "battlefield1").errors).toContain(
      "Card must be in the player's hand.",
    );
    expect(engine.playCard("player1", card.id, "battlefield1")).toBe(false);
    expect(engine.getState().players.player2.hand).toEqual([card]);
  });

  it("does not play a card that is not in hand", () => {
    const card = createMockCard({ id: "not-in-hand", cost: 0 });
    const engine = createMockEngine({
      zones: createZoneState("base", [card]),
      players: {
        player1: createMockPlayer(),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });

    expect(engine.canPlayCard("player1", card.id, "battlefield1")).toBe(false);
    expect(engine.playCard("player1", card.id, "battlefield1")).toBe(false);
    expect(engine.getState().zones.base).toEqual([card]);
  });

  it("does not play outside the allowed phase", () => {
    const card = createMockCard({ id: "wrong-phase", cost: 0 });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ hand: [card] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.DRAW,
        playerOrder: ["player1"],
      },
    });

    expect(engine.validatePlayCard("player1", card.id, "battlefield1").errors).toContain(
      "Cards can only be played during the main phase.",
    );
    expect(engine.playCard("player1", card.id, "battlefield1")).toBe(false);
  });

  it("does not play without enough available runes", () => {
    const card = createMockCard({ id: "too-expensive", cost: 2 });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({
          hand: [card],
          runePool: {
            available: 1,
            spent: 0,
          },
        }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });

    expect(engine.validatePlayCard("player1", card.id, "battlefield1").errors).toContain(
      "Not enough available runes to play this card.",
    );
    expect(engine.playCard("player1", card.id, "battlefield1")).toBe(false);
    expect(engine.getState().players.player1.runePool).toEqual({
      available: 1,
      spent: 0,
    });
  });

  it("spends runes and emits events when playing a card", () => {
    const card = createMockCard({ id: "paid-unit", cost: 2 });
    const runes = [
      createMockCard({ id: "pay-rune-1", kind: "rune" }),
      createMockCard({ id: "pay-rune-2", kind: "rune" }),
    ];
    const engine = createMockEngine({
      hand: [card],
      players: {
        player1: createMockPlayer({
          hand: [card],
          channeledRunes: runes,
          runePool: {
            available: 2,
            spent: 0,
          },
        }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    expect(engine.playCard("player1", card.id, "battlefield1")).toBe(true);

    expect(engine.getState().players.player1.runePool).toEqual({
      available: 0,
      spent: 2,
    });
    expect(engine.getState().players.player1.exhaustedRuneIds).toEqual([
      "pay-rune-1",
      "pay-rune-2",
    ]);
    expect(engine.getState().players.player1.hand).toEqual([]);
    expect(engine.getState().zones.battlefield1).toEqual([card]);
    expect(events).toEqual([
      {
        type: "RuneSpent",
        playerId: "player1",
        amount: 2,
      },
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "battlefield1",
      },
      {
        type: "CardPlayed",
        playerId: "player1",
        cardInstanceId: card.id,
        zoneId: "battlefield1",
      },
    ]);
  });

  it("resolves a played spell to trash", () => {
    const spell = createMockCard({ id: "simple-spell", kind: "spell", cost: 0 });
    const engine = createMockEngine({
      hand: [spell],
      players: {
        player1: createMockPlayer({ hand: [spell] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });

    expect(engine.playCard("player1", spell.id, "trash")).toBe(true);
    expect(engine.getState().players.player1.trash).toEqual([spell]);
    expect(engine.getState().zones.trash).toEqual([spell]);
  });

  it("does not play runes or battlefields as normal cards", () => {
    const rune = createMockCard({ id: "normal-rune", kind: "rune", cost: 0 });
    const battlefield = createMockCard({
      id: "normal-battlefield",
      kind: "battlefield",
      cost: 0,
    });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ hand: [rune, battlefield] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });

    expect(engine.canPlayCard("player1", rune.id, "channeledRunes")).toBe(false);
    expect(engine.canPlayCard("player1", battlefield.id, "battlefield1")).toBe(false);
    expect(engine.playCard("player1", rune.id, "channeledRunes")).toBe(false);
    expect(engine.playCard("player1", battlefield.id, "battlefield1")).toBe(false);
  });

  it("moves a card between zones", () => {
    const card = createMockCard({ id: "movable-card" });
    const engine = createMockEngine({
      zones: createZoneState("battlefield1", [card]),
    });
    const { events } = collectGameEvents(engine);

    engine.moveCard(card.id, "base");

    expect(engine.getState().zones.battlefield1).toEqual([]);
    expect(engine.getState().zones.base).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "base",
      },
    ]);
  });

  it("moves a card from hand to channeledRunes", () => {
    const card = createMockCard({ id: "channel-card" });
    const engine = createMockEngine({ hand: [card] });
    const { events } = collectGameEvents(engine);

    engine.moveCard(card.id, "channeledRunes");

    expect(engine.getState().hand).toEqual([]);
    expect(engine.getState().zones.channeledRunes).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "channeledRunes",
      },
    ]);
  });

  it("moves a card from channeledRunes back to hand", () => {
    const card = createMockCard({ id: "return-rune-card" });
    const engine = createMockEngine({
      zones: createZoneState("channeledRunes", [card]),
    });
    const { events } = collectGameEvents(engine);

    engine.moveCard(card.id, "hand");

    expect(engine.getState().zones.channeledRunes).toEqual([]);
    expect(engine.getState().hand).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "hand",
      },
    ]);
  });

  it("moves a card from battlefield to hand", () => {
    const card = createMockCard({ id: "battlefield-return-card" });
    const engine = createMockEngine({
      zones: createZoneState("battlefield1", [card]),
    });
    const { events } = collectGameEvents(engine);

    engine.moveCard(card.id, "hand");

    expect(engine.getState().zones.battlefield1).toEqual([]);
    expect(engine.getState().hand).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "hand",
      },
    ]);
  });

  it("moves a card from base to hand", () => {
    const card = createMockCard({ id: "base-return-card" });
    const engine = createMockEngine({
      zones: createZoneState("base", [card]),
    });
    const { events } = collectGameEvents(engine);

    engine.moveCard(card.id, "hand");

    expect(engine.getState().zones.base).toEqual([]);
    expect(engine.getState().hand).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "hand",
      },
    ]);
  });

  it("does not emit movement events for unknown cards", () => {
    const engine = createMockEngine();
    const { events } = collectGameEvents(engine);

    engine.moveCard("missing-card", "trash");
    engine.playCard("player1", "missing-card", "trash");
    engine.discardCard("missing-card");

    expect(events).toEqual([]);
  });

  it("discards a card into trash", () => {
    const card = createMockCard({ id: "discard-card" });
    const engine = createMockEngine({ hand: [card] });
    const { events } = collectGameEvents(engine);

    engine.discardCard(card.id);

    expect(engine.getState().hand).toEqual([]);
    expect(engine.getState().zones.trash).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardDiscarded",
        cardInstanceId: card.id,
      },
    ]);
  });

  it("returns a card from a zone to hand", () => {
    const card = createMockCard({ id: "return-card" });
    const engine = createMockEngine({
      zones: createZoneState("base", [card]),
    });
    const { events } = collectGameEvents(engine);

    engine.returnCardToHand(card.id);

    expect(engine.getState().zones.base).toEqual([]);
    expect(engine.getState().hand).toEqual([card]);
    expect(events).toEqual([
      {
        type: "CardMoved",
        cardInstanceId: card.id,
        zoneId: "hand",
      },
    ]);
  });

  it("shuffles a player's deck without changing its contents", () => {
    const cards = [
      createMockCard({ id: "deck-1" }),
      createMockCard({ id: "deck-2" }),
      createMockCard({ id: "deck-3" }),
    ];
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ deck: cards }),
      },
    });

    engine.shuffleDeck("player1");

    const shuffledDeck = engine.getState().players.player1.deck;
    expect(shuffledDeck).toHaveLength(cards.length);
    expect(shuffledDeck.map((card) => card.id).sort()).toEqual(
      cards.map((card) => card.id).sort(),
    );
  });

  it("ends the turn and advances to the next player", () => {
    const engine = new GameEngine(
      createMockGame({
        players: {
          player1: createMockPlayer(),
          player2: createMockPlayer({ hasDrawn: true, actionsRemaining: 0 }),
        },
        turn: {
          activePlayerId: "player1",
          turnNumber: 1,
          phase: TurnPhase.MAIN,
          playerOrder: ["player1", "player2"],
        },
      }),
    );
    const { events } = collectGameEvents(engine);

    engine.endTurn();

    expect(engine.getState().turn).toEqual({
      activePlayerId: "player2",
      turnNumber: 2,
      phase: TurnPhase.TURN_START,
      playerOrder: ["player1", "player2"],
    });
    expect(engine.getState().players.player2.hasDrawn).toBe(false);
    expect(engine.getState().players.player2.actionsRemaining).toBe(1);
    expect(events).toEqual([
      {
        type: "PhaseChanged",
        phase: TurnPhase.END,
        activePlayerId: "player1",
        turnNumber: 1,
      },
      {
        type: "TurnEnded",
        activePlayerId: "player1",
        turnNumber: 1,
      },
      {
        type: "PhaseChanged",
        phase: TurnPhase.TURN_START,
        activePlayerId: "player2",
        turnNumber: 2,
      },
      {
        type: "RunesReset",
        playerId: "player2",
      },
      {
        type: "TurnStarted",
        activePlayerId: "player2",
        turnNumber: 2,
      },
    ]);
  });

  it("moves from mulligan complete into the first turn", () => {
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ hasDrawn: true, actionsRemaining: 0 }),
        player2: createMockPlayer({ hasDrawn: true, actionsRemaining: 0 }),
      },
      turn: {
        activePlayerId: "player2",
        turnNumber: 1,
        phase: TurnPhase.MULLIGAN,
        playerOrder: ["player2", "player1"],
      },
      setup: {
        status: "MULLIGAN_PENDING",
        decksValidated: true,
        firstPlayerId: "player2",
        mulliganPlayerIds: ["player2", "player1"],
        completedMulliganPlayerIds: ["player2", "player1"],
        mulliganSetAsideCards: {},
        mulliganComplete: true,
        startOfGameCompletedPlayerIds: ["player2", "player1"],
        validationErrors: [],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.nextPhase();

    expect(engine.getState().turn).toEqual({
      activePlayerId: "player2",
      turnNumber: 1,
      phase: TurnPhase.TURN_START,
      playerOrder: ["player2", "player1"],
    });
    expect(engine.getState().setup.status).toBe("COMPLETE");
    expect(engine.getState().players.player2.hasDrawn).toBe(false);
    expect(engine.getState().players.player2.actionsRemaining).toBe(1);
    expect(events).toEqual([
      {
        type: "FirstPlayerChosen",
        playerId: "player2",
      },
      {
        type: "PhaseChanged",
        phase: TurnPhase.TURN_START,
        activePlayerId: "player2",
        turnNumber: 1,
      },
      {
        type: "RunesReset",
        playerId: "player2",
      },
      {
        type: "TurnStarted",
        activePlayerId: "player2",
        turnNumber: 1,
      },
    ]);
  });

  it("selects the setup first player as the first active player", () => {
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer(),
        player2: createMockPlayer(),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MULLIGAN,
        playerOrder: ["player2", "player1"],
      },
      setup: {
        status: "MULLIGAN_PENDING",
        decksValidated: true,
        firstPlayerId: "player2",
        mulliganPlayerIds: ["player2", "player1"],
        completedMulliganPlayerIds: ["player2", "player1"],
        mulliganSetAsideCards: {},
        mulliganComplete: true,
        startOfGameCompletedPlayerIds: ["player2", "player1"],
        validationErrors: [],
      },
    });

    engine.nextPhase();

    expect(engine.getState().turn.activePlayerId).toBe("player2");
  });

  it("advances phases and draws during the draw phase", () => {
    const drawCard = createMockCard({ id: "phase-draw" });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ deck: [drawCard] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.TURN_START,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.nextPhase();

    expect(engine.getState().turn.phase).toBe(TurnPhase.DRAW);
    expect(engine.getState().hand).toEqual([drawCard]);
    expect(engine.getState().players.player1.hasDrawn).toBe(true);
    expect(events).toEqual([
      {
        type: "PhaseChanged",
        phase: TurnPhase.DRAW,
        activePlayerId: "player1",
        turnNumber: 1,
      },
      {
        type: "CardDrawn",
        playerId: "player1",
        card: drawCard,
      },
    ]);
  });

  it("does not draw twice when advancing out of the draw phase", () => {
    const drawCard = createMockCard({ id: "phase-draw" });
    const secondCard = createMockCard({ id: "second-card" });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ deck: [drawCard, secondCard] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.TURN_START,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.nextPhase();
    engine.nextPhase();

    expect(engine.getState().turn.phase).toBe(TurnPhase.MAIN);
    expect(engine.getState().hand).toEqual([drawCard]);
    expect(engine.getState().players.player1.deck).toEqual([secondCard]);
    expect(events.filter((event) => event.type === "CardDrawn")).toHaveLength(1);
  });

  it("moves to main phase after draw phase", () => {
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ hasDrawn: true }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.DRAW,
        playerOrder: ["player1"],
      },
    });

    engine.nextPhase();

    expect(engine.getState().turn.phase).toBe(TurnPhase.MAIN);
  });

  it("emits TurnEnded when advancing into the end phase", () => {
    const engine = createMockEngine({
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.nextPhase();

    expect(engine.getState().turn.phase).toBe(TurnPhase.END);
    expect(events).toEqual([
      {
        type: "PhaseChanged",
        phase: TurnPhase.END,
        activePlayerId: "player1",
        turnNumber: 1,
      },
      {
        type: "TurnEnded",
        activePlayerId: "player1",
        turnNumber: 1,
      },
    ]);
  });

  it("advances directly to the next turn", () => {
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer(),
        player2: createMockPlayer(),
      },
      turn: {
        activePlayerId: "player2",
        turnNumber: 3,
        phase: TurnPhase.END,
        playerOrder: ["player1", "player2"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.nextTurn();

    expect(engine.getState().turn).toEqual({
      activePlayerId: "player1",
      turnNumber: 4,
      phase: TurnPhase.TURN_START,
      playerOrder: ["player1", "player2"],
    });
    expect(events).toEqual([
      {
        type: "PhaseChanged",
        phase: TurnPhase.TURN_START,
        activePlayerId: "player1",
        turnNumber: 4,
      },
      {
        type: "RunesReset",
        playerId: "player1",
      },
      {
        type: "TurnStarted",
        activePlayerId: "player1",
        turnNumber: 4,
      },
    ]);
  });

  it("increments turn number and resets per-turn flags for the next active player", () => {
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer(),
        player2: createMockPlayer({ hasDrawn: true, actionsRemaining: 0 }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 7,
        phase: TurnPhase.END,
        playerOrder: ["player1", "player2"],
      },
    });

    engine.nextTurn();

    expect(engine.getState().turn.turnNumber).toBe(8);
    expect(engine.getState().turn.activePlayerId).toBe("player2");
    expect(engine.getState().players.player2.hasDrawn).toBe(false);
    expect(engine.getState().players.player2.actionsRemaining).toBe(1);
  });

  it("draws a rune from the rune deck", () => {
    const rune = createMockCard({ id: "rune-1", kind: "rune" });
    const nextRune = createMockCard({ id: "rune-2", kind: "rune" });
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({ runeDeck: [rune, nextRune] }),
      },
    });
    const { events } = collectGameEvents(engine);

    const drawnRune = engine.drawRune("player1");

    expect(drawnRune).toEqual(rune);
    expect(engine.getState().players.player1.runeDeck).toEqual([nextRune]);
    expect(engine.getState().players.player1.hand).toEqual([rune]);
    expect(events).toEqual([
      {
        type: "RuneDrawn",
        playerId: "player1",
        card: rune,
      },
    ]);
  });

  it("channels a rune into the channeled runes zone and updates availability", () => {
    const rune = createMockCard({ id: "rune-channel", kind: "rune" });
    const engine = createMockEngine({
      hand: [rune],
      players: {
        player1: createMockPlayer({ hand: [rune] }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.channelRune("player1", rune.id);

    expect(engine.getState().players.player1.hand).toEqual([]);
    expect(engine.getState().players.player1.channeledRunes).toEqual([rune]);
    expect(engine.getState().zones.channeledRunes).toEqual([rune]);
    expect(engine.getState().players.player1.runePool).toEqual({
      available: 1,
      spent: 0,
    });
    expect(engine.getAvailableRunes("player1")).toBe(1);
    expect(events).toEqual([
      {
        type: "RuneChanneled",
        playerId: "player1",
        card: rune,
      },
    ]);
  });

  it("spends available runes and emits RuneSpent", () => {
    const runes = [
      createMockCard({ id: "rune-a", kind: "rune" }),
      createMockCard({ id: "rune-b", kind: "rune" }),
    ];
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({
          channeledRunes: runes,
          runePool: {
            available: 2,
            spent: 0,
          },
        }),
      },
    });
    const { events } = collectGameEvents(engine);

    engine.spendRunes("player1", 1);

    expect(engine.getState().players.player1.runePool).toEqual({
      available: 1,
      spent: 1,
    });
    expect(engine.getState().players.player1.exhaustedRuneIds).toEqual(["rune-a"]);
    expect(events).toEqual([
      {
        type: "RuneSpent",
        playerId: "player1",
        amount: 1,
      },
    ]);
  });

  it("does not spend more runes than available", () => {
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({
          runePool: {
            available: 1,
            spent: 0,
          },
        }),
      },
    });

    expect(() => {
      engine.spendRunes("player1", 2);
    }).toThrow("Cannot spend more runes than available.");
    expect(engine.getState().players.player1.runePool).toEqual({
      available: 1,
      spent: 0,
    });
  });

  it("recycles a channeled rune back to the rune deck", () => {
    const rune = createMockCard({ id: "recycle-rune", kind: "rune" });
    const engine = createMockEngine({
      zones: createZoneState("channeledRunes", [rune]),
      players: {
        player1: createMockPlayer({
          channeledRunes: [rune],
          runePool: {
            available: 1,
            spent: 0,
          },
        }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.MAIN,
        playerOrder: ["player1"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.recycleRune("player1", rune.id);

    expect(engine.getState().players.player1.channeledRunes).toEqual([]);
    expect(engine.getState().zones.channeledRunes).toEqual([]);
    expect(engine.getState().players.player1.runeDeck).toEqual([rune]);
    expect(engine.getState().players.player1.runePool.available).toBe(0);
    expect(events).toEqual([
      {
        type: "RuneRecycled",
        playerId: "player1",
        card: rune,
      },
    ]);
  });

  it("resets runes for the turn and emits RunesReset", () => {
    const runes = [
      createMockCard({ id: "reset-rune-a", kind: "rune" }),
      createMockCard({ id: "reset-rune-b", kind: "rune" }),
    ];
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer({
          channeledRunes: runes,
          exhaustedRuneIds: ["reset-rune-a"],
          runePool: {
            available: 1,
            spent: 1,
          },
        }),
      },
    });
    const { events } = collectGameEvents(engine);

    engine.resetRunesForTurn("player1");

    expect(engine.getState().players.player1.exhaustedRuneIds).toEqual([]);
    expect(engine.getState().players.player1.runePool).toEqual({
      available: 2,
      spent: 0,
    });
    expect(events).toEqual([
      {
        type: "RunesReset",
        playerId: "player1",
      },
    ]);
  });

  it("resets rune availability when advancing to the next player's turn", () => {
    const runes = [createMockCard({ id: "turn-rune", kind: "rune" })];
    const engine = createMockEngine({
      players: {
        player1: createMockPlayer(),
        player2: createMockPlayer({
          channeledRunes: runes,
          exhaustedRuneIds: ["turn-rune"],
          runePool: {
            available: 0,
            spent: 1,
          },
        }),
      },
      turn: {
        activePlayerId: "player1",
        turnNumber: 1,
        phase: TurnPhase.END,
        playerOrder: ["player1", "player2"],
      },
    });
    const { events } = collectGameEvents(engine);

    engine.nextTurn();

    expect(engine.getState().players.player2.exhaustedRuneIds).toEqual([]);
    expect(engine.getState().players.player2.runePool).toEqual({
      available: 1,
      spent: 0,
    });
    expect(events).toContainEqual({
      type: "RunesReset",
      playerId: "player2",
    });
  });
});
