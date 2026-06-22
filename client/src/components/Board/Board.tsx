import type { GameState } from "../../game/gameState";
import PlayerPlaymat from "./PlayerPlaymat";

type BoardProps = {
  gameState: GameState;
  isLoadingCards: boolean;
};

function Board({ gameState, isLoadingCards }: BoardProps) {
  return (
    <main className="game">
      <section className="board">
        <PlayerPlaymat perspective="opponent" />
        <div className="mulligan-divider">
          <div className="divider-line" />
          <button className="mulligan-button" type="button">
            Mulligan
          </button>
          <div className="divider-line" />
        </div>
        <PlayerPlaymat
          perspective="you"
          gameState={gameState}
          isLoadingCards={isLoadingCards}
        />
      </section>
    </main>
  );
}

export default Board;
