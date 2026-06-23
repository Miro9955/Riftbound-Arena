import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { GameCard } from "../../data/cards";
import type { ZoneId } from "../../game/gameState";
import GameCardView from "../GameCard/GameCard";

type ZoneProps = {
  title: string;
  className?: string;
  droppableId?: ZoneId;
  cards?: GameCard[];
  isLegalDropZone?: boolean;
};

function MiniCard({ card }: { card: GameCard }) {
  return (
    <div className="zone-card-mini">
      <GameCardView card={card} />
    </div>
  );
}

function DraggableZoneCard({ card }: { card: GameCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`draggable-card draggable-card-zone ${isDragging ? "is-dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      <MiniCard card={card} />
    </div>
  );
}

function Zone({
  title,
  className = "",
  droppableId,
  cards = [],
  isLegalDropZone = false,
}: ZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId ?? `static-${title}`,
    disabled: !droppableId,
  });

  const zoneClassName = [
    "zone",
    className,
    cards.length > 0 ? "has-zone-cards" : "",
    isLegalDropZone ? "is-legal-drop-zone" : "",
    isOver ? "is-over" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={setNodeRef}
      className={zoneClassName}
    >
      <span className="zone-label">{title}</span>
      {cards.length > 0 && (
        <div className="zone-card-list">
          {cards.map((card) => (
            <DraggableZoneCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Zone;
