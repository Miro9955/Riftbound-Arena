import { useDraggable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { GameCard as GameCardData } from "../../data/cards";
import GameCard from "../GameCard/GameCard";

type HandProps = {
  cards: GameCardData[];
  isLoading: boolean;
};

function DraggableHandCard({ card }: { card: GameCardData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });

  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      className={`draggable-card draggable-card-hand ${isDragging ? "is-dragging" : ""}`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <GameCard card={card} />
    </div>
  );
}

function Hand({ cards, isLoading }: HandProps) {
  return (
    <div className="hand">
      {isLoading ? (
        <div className="hand-loading">Loading cards...</div>
      ) : (
        cards.map((card) => <DraggableHandCard key={card.id} card={card} />)
      )}
    </div>
  );
}

export default Hand;
