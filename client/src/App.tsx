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
  findCard,
  isDropZoneId,
  type GameState,
} from "./game/gameState";
import { GameEngine } from "./game/engine/GameEngine";
import { loadCards } from "./services/CardDatabase";

function App() {
  const engineRef = useRef(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

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
          engine.setInitialHand(cards.slice(0, 5));
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
    const zoneId = event.over?.id ? String(event.over.id) : "";

    setActiveCardId(null);

    if (!isDropZoneId(zoneId)) {
      return;
    }

    engineRef.current.moveCard(cardId, zoneId);
  };

  const handleDragCancel = () => {
    setActiveCardId(null);
  };

  const activeCard = activeCardId ? findCard(gameState, activeCardId) : undefined;

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Board gameState={gameState} isLoadingCards={isLoadingCards} />
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
