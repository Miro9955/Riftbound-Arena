import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import Board from "./components/Board/Board";
import GameCard from "./components/GameCard/GameCard";
import {
  createInitialGameState,
  emptyBattlefields,
  emptyZones,
  isBattlefieldId,
  findCard,
  isDropZoneId,
  isZoneId,
  TurnPhase,
  type GameState,
  type ZoneId,
} from "./game/gameState";
import { GameEngine } from "./game/engine/GameEngine";
import { loadCards } from "./services/CardDatabase";
import type { GameCard as GameCardData } from "./data/cards";

const UI_PLAYER_ID = "player1";

function createUiGameState(cards: GameCardData[]): GameState {
  const initialState = createInitialGameState();
  const runeHandCards = cards.filter((card) => card.kind === "rune").slice(0, 1);
  const playableHandCards = cards
    .filter(
      (card) =>
        card.kind !== "rune" &&
        card.kind !== "battlefield" &&
        card.kind !== "champion",
    )
    .sort((firstCard, secondCard) => firstCard.cost - secondCard.cost)
    .slice(0, 4);
  const hand = [...playableHandCards, ...runeHandCards].slice(0, 5);
  const handIds = new Set(hand.map((card) => card.id));
  const player = initialState.players[UI_PLAYER_ID];

  return {
    ...initialState,
    hand,
    zones: emptyZones(),
    battlefields: emptyBattlefields(),
    scores: {
      ...initialState.scores,
      [UI_PLAYER_ID]: 0,
    },
    players: {
      ...initialState.players,
      [UI_PLAYER_ID]: {
        ...player,
        hand,
        deck: cards
          .filter(
            (card) =>
              !handIds.has(card.id) &&
              card.kind !== "rune" &&
              card.kind !== "battlefield",
          )
          .slice(0, 40),
        runeDeck: cards
          .filter((card) => !handIds.has(card.id) && card.kind === "rune")
          .slice(0, 12),
        channeledRunes: [],
        exhaustedRuneIds: [],
        runePool: {
          available: 0,
          spent: 0,
        },
        trash: [],
        base: [],
      },
    },
    turn: {
      ...initialState.turn,
      activePlayerId: UI_PLAYER_ID,
      turnNumber: 1,
      phase: TurnPhase.MAIN,
      playerOrder: [UI_PLAYER_ID],
    },
    setup: {
      ...initialState.setup,
      status: "COMPLETE",
      firstPlayerId: UI_PLAYER_ID,
      startOfGameCompletedPlayerIds: [UI_PLAYER_ID],
    },
  };
}

function getCardZone(gameState: GameState, cardId: string): ZoneId | undefined {
  return (Object.keys(gameState.zones) as ZoneId[]).find((zoneId) =>
    gameState.zones[zoneId].some((card) => card.id === cardId),
  );
}

function App() {
  const engineRef = useRef(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(() => {
      setGameState(engineRef.current.getState());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    let isMounted = true;

    loadCards()
      .then((cards) => {
        if (isMounted) {
          engine.setState(createUiGameState(cards));
          setGameState(engine.getState());
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingCards(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const cardId = String(event.active.id);
    const dropTargetId = event.over?.id ? String(event.over.id) : "";
    const engine = engineRef.current;

    setActiveCardId(null);
    setStatusMessage(null);

    if (!isDropZoneId(dropTargetId) || dropTargetId === "hand") {
      return;
    }

    const nextState = engine.getState();
    const player = nextState.players[UI_PLAYER_ID];
    const cardInHand = player.hand.find((card) => card.id === cardId);
    const currentZoneId = getCardZone(nextState, cardId);

    try {
      let didMutate = false;

      if (dropTargetId === "channeledRunes" && cardInHand?.kind === "rune") {
        engine.channelRune(UI_PLAYER_ID, cardId);
        didMutate = true;
      } else if (dropTargetId === "trash") {
        const discardCard = findCard(nextState, cardId);

        if (!discardCard) {
          throw new Error("Only visible cards can be discarded from the board.");
        }

        engine.discardCard(cardId);
        const stateAfterDiscard = engine.getState();
        const playerAfterDiscard = stateAfterDiscard.players[UI_PLAYER_ID];

        engine.setState({
          ...stateAfterDiscard,
          players: {
            ...stateAfterDiscard.players,
            [UI_PLAYER_ID]: {
              ...playerAfterDiscard,
              hand: playerAfterDiscard.hand.filter((card) => card.id !== cardId),
              base: playerAfterDiscard.base.filter((card) => card.id !== cardId),
              trash: playerAfterDiscard.trash.some((card) => card.id === cardId)
                ? playerAfterDiscard.trash
                : [...playerAfterDiscard.trash, discardCard],
            },
          },
        });
        didMutate = true;
      } else if (cardInHand && isZoneId(dropTargetId)) {
        const validation = engine.validatePlayCard(
          UI_PLAYER_ID,
          cardId,
          dropTargetId,
        );

        if (!validation.ok) {
          throw new Error(validation.errors.join(" "));
        }

        didMutate = engine.playCard(UI_PLAYER_ID, cardId, dropTargetId);
      } else if (
        currentZoneId &&
        isBattlefieldId(dropTargetId) &&
        findCard(nextState, cardId)?.kind === "unit"
      ) {
        const validation = engine.validateMoveUnit(
          UI_PLAYER_ID,
          cardId,
          dropTargetId,
        );

        if (!validation.ok) {
          throw new Error(validation.errors.join(" "));
        }

        didMutate = engine.moveUnit(UI_PLAYER_ID, cardId, dropTargetId);
      }

      if (!didMutate) {
        throw new Error("That move is not legal right now.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid move.";
      console.warn(message);
      setStatusMessage(message);
    } finally {
      setGameState(engine.getState());
    }
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
  };

  // TODO(UI tests): add drag/drop integration coverage once the project has a DOM test harness.
  const runEngineAction = (action: () => void) => {
    setStatusMessage(null);

    try {
      action();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed.";
      console.warn(message);
      setStatusMessage(message);
    } finally {
      setGameState(engineRef.current.getState());
    }
  };

  const handleNextPhase = () => {
    runEngineAction(() => {
      engineRef.current.nextPhase();
    });
  };

  const handleEndTurn = () => {
    runEngineAction(() => {
      engineRef.current.endTurn();
    });
  };

  const handleDrawRune = () => {
    runEngineAction(() => {
      const activePlayerId = engineRef.current.getState().turn.activePlayerId;
      const rune = engineRef.current.drawRune(activePlayerId);

      if (!rune) {
        throw new Error("No rune is available to draw.");
      }
    });
  };

  const handleConfirmMulligan = () => {
    runEngineAction(() => {
      const { currentMulliganPlayerId } = engineRef.current.getState().setup;

      if (!currentMulliganPlayerId) {
        throw new Error("No mulligan decision is pending.");
      }

      engineRef.current.chooseMulliganCards(currentMulliganPlayerId, []);
      engineRef.current.resolveMulligan(currentMulliganPlayerId);
    });
  };

  const activeCard = activeCardId ? findCard(gameState, activeCardId) : undefined;

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Board
        gameState={gameState}
        isLoadingCards={isLoadingCards}
        statusMessage={statusMessage}
        onNextPhase={handleNextPhase}
        onEndTurn={handleEndTurn}
        onDrawRune={handleDrawRune}
        onConfirmMulligan={handleConfirmMulligan}
      />
      <DragOverlay wrapperElement="div" className="drag-overlay">
        {activeCard ? (
          <div className="drag-overlay-card">
            <GameCard card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
