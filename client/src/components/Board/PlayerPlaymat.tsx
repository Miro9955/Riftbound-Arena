import type { GameCard } from "../../data/cards";
import type { DropZoneId, GameState, ZoneId } from "../../game/gameState";
import type { ReactNode } from "react";
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

function PlayerPlaymat({
  perspective,
  gameState,
  isLoadingCards = false,
  playableCardIds = [],
  legalDropZoneIds = [],
}: PlayerPlaymatProps) {
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
              />
              <Zone
                title="Battlefield 2"
                className="battlefield battlefield-zone"
                droppableId={activeZones ? "battlefield2" : undefined}
                cards={activeZones ? gameState.zones.battlefield2 : undefined}
                isLegalDropZone={isLegalDropZone("battlefield2")}
              />
              <Zone
                title="Channeled Runes"
                className="rune-zone channeled-zone resource-zone"
                droppableId={activeZones ? "channeledRunes" : undefined}
                cards={activeZones ? gameState.zones.channeledRunes : undefined}
                isLegalDropZone={isLegalDropZone("channeledRunes")}
              />
              <Zone
                title="Base"
                className="base-zone resource-zone"
                droppableId={activeZones ? "base" : undefined}
                cards={activeZones ? gameState.zones.base : undefined}
                isLegalDropZone={isLegalDropZone("base")}
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
    </section>
  );
}

export default PlayerPlaymat;
