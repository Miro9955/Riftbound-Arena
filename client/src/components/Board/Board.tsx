import type { GameState } from "../../game/gameState";
import PlayerPlaymat from "./PlayerPlaymat";

type BoardProps = {
  gameState: GameState;
  isLoadingCards: boolean;
  statusMessage?: string | null;
  onNextPhase: () => void;
  onEndTurn: () => void;
  onDrawRune: () => void;
  onConfirmMulligan: () => void;
};

function Board({
  gameState,
  isLoadingCards,
  statusMessage,
  onNextPhase,
  onEndTurn,
  onDrawRune,
  onConfirmMulligan,
}: BoardProps) {
  const activePlayer = gameState.players[gameState.turn.activePlayerId];
  const score = gameState.scores[gameState.turn.activePlayerId] ?? 0;
  const trashCount = activePlayer?.trash.length ?? gameState.zones.trash.length;
  const winnerText = gameState.game.winnerId
    ? `Winner: ${gameState.game.winnerId}`
    : gameState.game.winningPlayerIds.length > 0
      ? `Winners: ${gameState.game.winningPlayerIds.join(", ")}`
      : "Game in progress";

  return (
    <main className="game">
      <section className="board">
        <PlayerPlaymat perspective="opponent" />
        <div className="mulligan-divider">
          <div className="divider-line" />
          <div className="engine-controls" aria-live="polite">
            <div className="engine-status">
              <span>{gameState.turn.activePlayerId}</span>
              <span>{gameState.turn.phase}</span>
              <span>Score {score}</span>
              <span>
                Runes {activePlayer?.runePool.available ?? 0}/
                {activePlayer?.channeledRunes.length ?? 0}
              </span>
              <span>Deck {activePlayer?.deck.length ?? 0}</span>
              <span>Trash {trashCount}</span>
              <span>{winnerText}</span>
            </div>
            <div className="engine-actions">
              <button type="button" onClick={onNextPhase}>
                Next Phase
              </button>
              <button type="button" onClick={onEndTurn}>
                End Turn
              </button>
              <button type="button" onClick={onDrawRune}>
                Draw Rune
              </button>
              <button type="button" onClick={onConfirmMulligan}>
                Confirm Mulligan
              </button>
            </div>
            {statusMessage && <p className="engine-message">{statusMessage}</p>}
          </div>
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
