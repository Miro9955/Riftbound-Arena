import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { GameCard as GameCardData } from "../../data/cards";
import GameCard from "../GameCard/GameCard";

type HandProps = {
  cards: GameCardData[];
  isLoading: boolean;
  playableCardIds?: string[];
};

function DraggableHandTrayCard({
  card,
  index,
  total,
  isPlayable,
}: {
  card: GameCardData;
  index: number;
  total: number;
  isPlayable: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  const center = (total - 1) / 2;
  const offset = index - center;
  const maxRotation = total > 7 ? 9 : 12;
  const rotation = Math.max(-maxRotation, Math.min(maxRotation, offset * 4));
  const verticalOffset = Math.abs(offset) * 4;
  const style = {
    "--card-rotation": `${rotation}deg`,
    "--card-y": `${verticalOffset}px`,
    "--card-z": index + 1,
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      className={`draggable-card draggable-card-hand hand-tray-card ${
        isDragging ? "is-dragging" : ""
      } ${isPlayable ? "is-playable" : "is-not-playable"}`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <GameCard card={card} />
    </div>
  );
}

function HandTray({ cards, isLoading, playableCardIds = [] }: HandProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "hand",
  });
  const playableCardIdSet = new Set(playableCardIds);

  return (
    <div ref={setNodeRef} className={`hand hand-tray ${isOver ? "is-over" : ""}`}>
      {isLoading ? (
        <div className="hand-loading">Loading cards...</div>
      ) : (
        cards.map((card, index) => (
          <DraggableHandTrayCard
            key={card.id}
            card={card}
            index={index}
            total={cards.length}
            isPlayable={playableCardIdSet.has(card.id)}
          />
        ))
      )}
    </div>
  );
}

export default HandTray;
