import type { GameState } from "../../game/gameState";
import Hand from "../Hand/Hand";
import Zone from "../Zone/Zone";

type BoardProps = {
  gameState: GameState;
  isLoadingCards: boolean;
};

function Board({ gameState, isLoadingCards }: BoardProps) {
  return (
    <main className="game">
      <section className="board">
        <div className="battlefield-cards">
          <Zone title="Battlefield Card" className="battlefield-card" />
          <Zone title="Battlefield Card" className="battlefield-card" />
        </div>

        <div className="main-grid">
          <Zone
            title="Battlefield 1"
            className="battlefield"
            droppableId="battlefield1"
            cards={gameState.zones.battlefield1}
          />
          <Zone
            title="Battlefield 2"
            className="battlefield"
            droppableId="battlefield2"
            cards={gameState.zones.battlefield2}
          />
          <Zone title="Legend" className="side-zone" />
          <Zone title="Chosen Champion" className="side-zone" />

          <Zone title="Runes" className="small-zone runes" />
          <Zone
            title="Channeled Runes"
            className="rune-zone"
            droppableId="channeledRunes"
            cards={gameState.zones.channeledRunes}
          />
          <Zone
            title="Base"
            className="base-zone"
            droppableId="base"
            cards={gameState.zones.base}
          />
          <Zone title="Deck" className="side-zone" />
          <Zone
            title="Trash"
            className="side-zone"
            droppableId="trash"
            cards={gameState.zones.trash}
          />
        </div>

        <Hand cards={gameState.hand} isLoading={isLoadingCards} />
      </section>
    </main>
  );
}

export default Board;
