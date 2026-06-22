import { useState, type KeyboardEvent } from "react";
import type { GameCard as GameCardData } from "../../data/cards";

type GameCardProps = {
  card: GameCardData;
};

function GameCard({ card }: GameCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const hasCombatStats = card.kind === "unit" || card.kind === "champion";
  const hasGearBonus = card.kind === "gear" && card.power > 0;

  if (card.imageUrl) {
    const togglePreview = () => {
      setIsPreviewOpen((isOpen) => !isOpen);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePreview();
      }
    };

    return (
      <article
        className={`game-card game-card-real ${isPreviewOpen ? "is-preview-open" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={`Preview ${card.name}`}
        onClick={togglePreview}
        onBlur={() => setIsPreviewOpen(false)}
        onMouseLeave={() => setIsPreviewOpen(false)}
        onKeyDown={handleKeyDown}
      >
        <img className="game-card-image" src={card.imageUrl} alt={card.name} />
        <div className="game-card-preview" aria-hidden="true">
          <img src={card.imageUrl} alt="" />
        </div>
      </article>
    );
  }

  return (
    <article className={`game-card game-card-${card.color} game-card-kind-${card.kind}`}>
      <div className="game-card-inner">
        <div className="game-card-cost">{card.cost}</div>
        <div className="game-card-art">
          <div className="game-card-art-glow" />
        </div>
        <div className="game-card-name-bar">
          <h2 className="game-card-name">{card.name}</h2>
        </div>
        <div className="game-card-kind">{card.kind}</div>
        <div className="game-card-text-box">
          <p className="game-card-text">{card.text}</p>
        </div>
        {hasCombatStats && (
          <>
            <div className="game-card-stat game-card-power">{card.power}</div>
            <div className="game-card-stat game-card-health">{card.health}</div>
          </>
        )}
        {hasGearBonus && (
          <div className="game-card-stat game-card-gear-bonus">+{card.power}</div>
        )}
      </div>
    </article>
  );
}

export default GameCard;
