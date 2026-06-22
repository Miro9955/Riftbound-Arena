import type { GameCard } from "../../data/cards";
import type { GameState } from "../../game/gameState";
import type { ReactNode } from "react";
import HandTray from "../Hand/Hand";
import Zone from "../Zone/Zone";

type PlayerPlaymatProps = {
  perspective: "opponent" | "you";
  gameState?: GameState;
  isLoadingCards?: boolean;
};

function SidePanel({ side, children }: { side: "status" | "cards"; children: ReactNode }) {
  return <aside className={`playmat-side playmat-side-${side}`}>{children}</aside>;
}

function ScorePanel() {
  return (
    <div className="score-panel">
      <span>Score</span>
      <strong>0</strong>
    </div>
  );
}

function RunePanel({ opponent = false }: { opponent?: boolean }) {
  return (
    <div className="rune-panel">
      <span>Runes</span>
      <small>0/0</small>
      <div className="rune-card-back">{opponent ? "120" : "120"}</div>
    </div>
  );
}

function PlayerPlaymat({
  perspective,
  gameState,
  isLoadingCards = false,
}: PlayerPlaymatProps) {
  const isOpponent = perspective === "opponent";
  const activeZones = !isOpponent && gameState;
  const handCards: GameCard[] = activeZones ? gameState.hand : [];

  const statusPanel = (
    <SidePanel side="status">
      <ScorePanel />
      <RunePanel opponent={isOpponent} />
    </SidePanel>
  );

  const cardPanel = (
    <SidePanel side="cards">
      <Zone title="Legend" className="side-zone side-card-zone" />
      <Zone title="Chosen Champion" className="side-zone side-card-zone" />
      <Zone title="Deck" className="side-zone side-card-zone deck-zone" />
      <Zone
        title="Trash"
        className="side-zone side-card-zone"
        droppableId={activeZones ? "trash" : undefined}
        cards={activeZones ? gameState.zones.trash : undefined}
      />
    </SidePanel>
  );

  return (
    <section className={`player-playmat player-playmat-${perspective}`}>
      <div className="player-label">
        <span>{isOpponent ? "Opponent" : "You"}</span>
        <strong>0</strong>
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
              />
              <Zone
                title="Battlefield 2"
                className="battlefield battlefield-zone"
                droppableId={activeZones ? "battlefield2" : undefined}
                cards={activeZones ? gameState.zones.battlefield2 : undefined}
              />
              <Zone
                title="Channeled Runes"
                className="rune-zone channeled-zone resource-zone"
                droppableId={activeZones ? "channeledRunes" : undefined}
                cards={activeZones ? gameState.zones.channeledRunes : undefined}
              />
              <Zone
                title="Base"
                className="base-zone resource-zone"
                droppableId={activeZones ? "base" : undefined}
                cards={activeZones ? gameState.zones.base : undefined}
              />
            </div>

          </div>
        </div>

        {isOpponent ? statusPanel : cardPanel}
      </div>

      {!isOpponent && (
        <div className="playmat-hand">
          <HandTray cards={handCards} isLoading={isLoadingCards} />
        </div>
      )}
    </section>
  );
}

export default PlayerPlaymat;
