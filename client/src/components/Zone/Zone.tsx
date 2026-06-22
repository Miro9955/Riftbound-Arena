import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { GameCard } from "../../data/cards";
import type { ZoneId } from "../../game/gameState";

type ZoneProps = {
  title: string;
  className?: string;
  droppableId?: ZoneId;
  cards?: GameCard[];
};

function MiniCard({ card }: { card: GameCard }) {
  return (
    <div className="zone-card-mini" title={card.name}>
      {card.imageUrl ? (
        <img src={card.imageUrl} alt={card.name} />
      ) : (
        <span>{card.name}</span>
      )}
    </div>
  );
}

function DraggableZoneCard({ card }: { card: GameCard }) {
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
      className={`draggable-card draggable-card-zone ${isDragging ? "is-dragging" : ""}`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <MiniCard card={card} />
    </div>
  );
}

function Zone({ title, className = "", droppableId, cards = [] }: ZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId ?? `static-${title}`,
    disabled: !droppableId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`zone ${className} ${cards.length > 0 ? "has-zone-cards" : ""} ${
        isOver ? "is-over" : ""
      }`}
    >
      <span className="zone-label">{title}</span>
      {cards.length > 0 && (
        <div className="zone-cards">
          {cards.map((card) => (
            <DraggableZoneCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Zone;
