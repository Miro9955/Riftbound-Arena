import type { GameCard } from "../../data/cards";
import type { DropZoneId, GameState, ZoneId } from "../../game/gameState";
import { useEffect, useState, type ReactNode } from "react";
import GameCardView from "../GameCard/GameCard";
import HandTray from "../Hand/Hand";
import Zone from "../Zone/Zone";

type PlayerPlaymatProps = {
  perspective: "opponent" | "you";
  gameState?: GameState;
  isLoadingCards?: boolean;
  playableCardIds?: string[];
  legalDropZoneIds?: DropZoneId[];
};

function SidePanel({ side, children }: { side: "status" | "cards"; children: ReactNode }) {
  return <aside className={`playmat-side playmat-side-${side}`}>{children}</aside>;
}

function ScorePanel({ score = 0 }: { score?: number }) {
  return (
    <div className="score-panel">
      <span>Score</span>
      <strong>{score}</strong>
    </div>
  );
}

function RunePanel({
  opponent = false,
  available = 0,
  total = 0,
  runeDeckCount = 0,
}: {
  opponent?: boolean;
  available?: number;
  total?: number;
  runeDeckCount?: number;
}) {
  return (
    <div className="rune-panel">
      <span>Runes</span>
      <small>
        {available}/{total}
      </small>
      <div className="rune-card-back">{opponent ? "0" : runeDeckCount}</div>
    </div>
  );
}

function TrashModal({
  cards,
  onClose,
}: {
  cards: GameCard[];
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="zone-modal-backdrop" onMouseDown={onClose}>
      <div
        className="zone-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Trash"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="zone-modal-header">
          <h2>Trash {cards.length}</h2>
          <button type="button" onClick={onClose} aria-label="Close trash">
            Close
          </button>
        </div>
        <div className="zone-modal-card-grid">
          {cards.length === 0 ? (
            <p className="zone-modal-empty">Trash is empty.</p>
          ) : (
            cards.map((card) => (
              <div className="zone-modal-card" key={card.id}>
                <GameCardView card={card} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// TODO(UI tests): verify the trash zone renders as a compact pile once DOM component tests are configured.
function PlayerPlaymat({
  perspective,
  gameState,
  isLoadingCards = false,
  playableCardIds = [],
  legalDropZoneIds = [],
}: PlayerPlaymatProps) {
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const isOpponent = perspective === "opponent";
  const activeZones = !isOpponent && gameState;
  const player = activeZones
    ? gameState.players[gameState.turn.activePlayerId]
    : undefined;
  const playerScore =
    activeZones && player
      ? (gameState.scores[gameState.turn.activePlayerId] ?? 0)
      : 0;
  const handCards: GameCard[] = activeZones ? player?.hand ?? gameState.hand : [];
  const isLegalDropZone = (zoneId: ZoneId) =>
    legalDropZoneIds.includes(zoneId);

  const statusPanel = (
    <SidePanel side="status">
      <ScorePanel score={playerScore} />
      <RunePanel
        opponent={isOpponent}
        available={player?.runePool.available ?? 0}
        total={player?.channeledRunes.length ?? 0}
        runeDeckCount={player?.runeDeck.length ?? 0}
      />
    </SidePanel>
  );

  const cardPanel = (
    <SidePanel side="cards">
      <Zone title="Legend" className="side-zone side-card-zone" />
      <Zone title="Chosen Champion" className="side-zone side-card-zone" />
      <Zone
        title={activeZones ? `Deck ${player?.deck.length ?? 0}` : "Deck"}
        className="side-zone side-card-zone deck-zone"
      />
      <Zone
        title={activeZones ? `Trash ${player?.trash.length ?? 0}` : "Trash"}
        className="side-zone side-card-zone"
        droppableId={activeZones ? "trash" : undefined}
        cards={activeZones ? gameState.zones.trash : undefined}
        isLegalDropZone={isLegalDropZone("trash")}
        displayMode="pile"
        countLabel={activeZones ? `${gameState.zones.trash.length}` : undefined}
        onZoneClick={activeZones ? () => setIsTrashOpen(true) : undefined}
      />
    </SidePanel>
  );

  return (
    <section className={`player-playmat player-playmat-${perspective}`}>
      <div className="player-label">
        <span>{isOpponent ? "Opponent" : "You"}</span>
        <strong>{playerScore}</strong>
      </div>

      <div className="playmat-layout">
        {isOpponent ? cardPanel : statusPanel}

        <div className="playmat-core">
          <div className="playmat-body">
            <div className="playmat-center">
              <Zone title="Battlefield Card" className="battlefield-card-slot" />
              <Zone title="Battlefield Card" className="battlefield-card-slot" />
              <Zone
                title="Battlefield 1"
                className="battlefield battlefield-zone"
                droppableId={activeZones ? "battlefield1" : undefined}
                cards={activeZones ? gameState.zones.battlefield1 : undefined}
                isLegalDropZone={isLegalDropZone("battlefield1")}
                displayMode="stack"
              />
              <Zone
                title="Battlefield 2"
                className="battlefield battlefield-zone"
                droppableId={activeZones ? "battlefield2" : undefined}
                cards={activeZones ? gameState.zones.battlefield2 : undefined}
                isLegalDropZone={isLegalDropZone("battlefield2")}
                displayMode="stack"
              />
              <Zone
                title="Channeled Runes"
                className="rune-zone channeled-zone resource-zone"
                droppableId={activeZones ? "channeledRunes" : undefined}
                cards={activeZones ? gameState.zones.channeledRunes : undefined}
                isLegalDropZone={isLegalDropZone("channeledRunes")}
                displayMode="stack"
                countLabel={
                  activeZones ? `${gameState.zones.channeledRunes.length}` : undefined
                }
              />
              <Zone
                title="Base"
                className="base-zone resource-zone"
                droppableId={activeZones ? "base" : undefined}
                cards={activeZones ? gameState.zones.base : undefined}
                isLegalDropZone={isLegalDropZone("base")}
                displayMode="stack"
              />
            </div>

          </div>
        </div>

        {isOpponent ? statusPanel : cardPanel}
      </div>

      {!isOpponent && (
        <div className="playmat-hand">
          <HandTray
            cards={handCards}
            isLoading={isLoadingCards}
            playableCardIds={playableCardIds}
          />
        </div>
      )}
      {activeZones && isTrashOpen && (
        <TrashModal cards={gameState.zones.trash} onClose={() => setIsTrashOpen(false)} />
      )}
    </section>
  );
}

export default PlayerPlaymat;
