import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import Board from "./components/Board/Board";
import {
  createInitialGameState,
  isZoneId,
  type GameState,
} from "./game/gameState";
import { GameEngine } from "./game/engine/GameEngine";
import { loadCards } from "./services/CardDatabase";

function App() {
  const engineRef = useRef(new GameEngine());
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const cardId = String(event.active.id);
    const zoneId = event.over?.id ? String(event.over.id) : "";

    if (!isZoneId(zoneId)) {
      return;
    }

    engineRef.current.moveCard(cardId, zoneId);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Board gameState={gameState} isLoadingCards={isLoadingCards} />
    </DndContext>
  );
}

export default App;
