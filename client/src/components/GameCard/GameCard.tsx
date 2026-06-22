import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { GameCard as GameCardData } from "../../data/cards";

type GameCardProps = {
  card: GameCardData;
};

function GameCard({ card }: GameCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewMounted, setIsPreviewMounted] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ left: 0, top: 0 });
  const cardRef = useRef<HTMLElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const hasCombatStats = card.kind === "unit" || card.kind === "champion";
  const hasGearBonus = card.kind === "gear" && card.power > 0;

  useEffect(() => {
    return () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  if (card.imageUrl) {
    const updatePreviewPosition = () => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) {
        setPreviewPosition({
          left: window.innerWidth / 2,
          top: window.innerHeight / 2,
        });
        return;
      }

      const gap = 18;
      const padding = 16;
      const previewWidth = Math.min(310, Math.max(200, window.innerWidth * 0.16));
      const previewHeight = Math.min(window.innerHeight * 0.7, previewWidth * (88 / 63));
      const rightSide = rect.right + gap;
      const leftSide = rect.left - gap - previewWidth;
      const preferredLeft =
        rightSide + previewWidth <= window.innerWidth - padding
          ? rightSide
          : leftSide >= padding
            ? leftSide
            : (window.innerWidth - previewWidth) / 2;
      const preferredTop = rect.top + rect.height / 2 - previewHeight / 2;

      setPreviewPosition({
        left: Math.max(
          padding,
          Math.min(window.innerWidth - previewWidth - padding, preferredLeft),
        ),
        top: Math.max(
          padding,
          Math.min(window.innerHeight - previewHeight - padding, preferredTop),
        ),
      });
    };

    const openPreview = (delay = 0) => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }

      const showPreview = () => {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
        }

        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
        }

        updatePreviewPosition();
        setIsPreviewOpen(true);
        setIsPreviewMounted(true);
        frameRef.current = window.requestAnimationFrame(() => {
          setIsPreviewVisible(true);
        });
      };

      if (delay > 0) {
        openTimerRef.current = window.setTimeout(showPreview, delay);
        return;
      }

      showPreview();
    };

    const closePreview = () => {
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      setIsPreviewOpen(false);
      setIsPreviewVisible(false);
      closeTimerRef.current = window.setTimeout(() => {
        setIsPreviewMounted(false);
      }, 180);
    };

    const togglePreview = () => {
      updatePreviewPosition();

      if (isPreviewOpen) {
        closePreview();
        return;
      }

      openPreview();
    };

    const handleClick = (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      togglePreview();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePreview();
      }
    };

    return (
      <>
        <article
          ref={cardRef}
          className={`game-card game-card-real ${isPreviewOpen ? "is-preview-open" : ""}`}
          role="button"
          tabIndex={0}
          aria-label={`Preview ${card.name}`}
          onClick={handleClick}
          onBlur={closePreview}
          onFocus={() => openPreview()}
          onMouseEnter={() => openPreview(80)}
          onMouseLeave={closePreview}
          onKeyDown={handleKeyDown}
        >
          <img className="game-card-image" src={card.imageUrl} alt={card.name} />
        </article>
        {isPreviewMounted &&
          createPortal(
            <div className="card-zoom-portal" aria-hidden="true">
              <img
                className={`card-zoom-preview ${
                  isPreviewVisible ? "is-visible" : ""
                }`}
                src={card.imageUrl}
                alt=""
                style={
                  {
                    "--preview-left": `${previewPosition.left}px`,
                    "--preview-top": `${previewPosition.top}px`,
                  } as CSSProperties
                }
              />
            </div>,
            document.body,
          )}
      </>
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
