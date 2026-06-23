import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { GameCard } from "../../data/cards";
import type { ZoneId } from "../../game/gameState";
import GameCardView from "../GameCard/GameCard";

type ZoneProps = {
  title: string;
  className?: string;
  droppableId?: ZoneId;
  cards?: GameCard[];
  isLegalDropZone?: boolean;
  displayMode?: "stack" | "pile";
  countLabel?: string;
  onZoneClick?: () => void;
};

function MiniCard({ card }: { card: GameCard }) {
  return (
    <div className="zone-card-mini">
      <GameCardView card={card} />
    </div>
  );
}

function getZoneDensityClass(cardCount: number) {
  if (cardCount >= 9) {
    return "crowded";
  }

  if (cardCount >= 6) {
    return "many";
  }

  return "few";
}

function DraggableZoneCard({
  card,
  index,
  displayMode,
}: {
  card: GameCard;
  index: number;
  displayMode: "stack" | "pile";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
  });
  const style = {
    "--zone-card-z": index + 1,
  } as CSSProperties;

  return (
    <div
      ref={setNodeRef}
      className={`draggable-card draggable-card-zone ${
        displayMode === "pile" ? "trash-pile-card" : "board-zone-card"
      } ${
        isDragging ? "is-dragging" : ""
      }`}
      style={style}
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
  displayMode = "stack",
  countLabel,
  onZoneClick,
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
    displayMode === "pile" ? "is-pile-zone" : "is-stack-zone",
    onZoneClick ? "is-clickable-zone" : "",
    isOver ? "is-over" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const visibleCards = displayMode === "pile" ? cards.slice(-1) : cards;
  const densityClass = getZoneDensityClass(cards.length);
  const cardListClassName =
    displayMode === "pile"
      ? "trash-pile"
      : `board-zone-card-list zone-card-row zone-card-row-${densityClass}`;

  return (
    <div
      ref={setNodeRef}
      className={zoneClassName}
      onClick={onZoneClick}
      role={onZoneClick ? "button" : undefined}
      tabIndex={onZoneClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onZoneClick) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onZoneClick();
        }
      }}
    >
      <span className="zone-label">{title}</span>
      {countLabel && <span className="zone-count-label">{countLabel}</span>}
      {cards.length > 0 && (
        <div className={cardListClassName} data-count={densityClass}>
          {visibleCards.map((card, index) => (
            <DraggableZoneCard
              key={card.id}
              card={card}
              index={index}
              displayMode={displayMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Zone;
