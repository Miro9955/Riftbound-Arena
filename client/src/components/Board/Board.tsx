import type { DropZoneId, GameState } from "../../game/gameState";
import PlayerPlaymat from "./PlayerPlaymat";

type BoardProps = {
  gameState: GameState;
  isLoadingCards: boolean;
  statusMessage?: string | null;
  controlState: {
    canNextPhase: boolean;
    canEndTurn: boolean;
    canDrawRune: boolean;
    canConfirmMulligan: boolean;
  };
  playableCardIds: string[];
  legalDropZoneIds: DropZoneId[];
  onNextPhase: () => void;
  onEndTurn: () => void;
  onDrawRune: () => void;
  onConfirmMulligan: () => void;
};

function Board({
  gameState,
  isLoadingCards,
  statusMessage,
  controlState,
  playableCardIds,
  legalDropZoneIds,
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
  const boardClassName = `board ${gameState.game.gameOver ? "is-game-over" : ""}`;

  return (
    <main className="game">
      <section className={boardClassName}>
        <PlayerPlaymat perspective="opponent" />
        <div className="mulligan-divider">
          <div className="divider-line" />
          <div className="engine-controls" aria-live="polite">
            <div className="engine-status">
              <span className="engine-status-primary">
                Active {gameState.turn.activePlayerId}
              </span>
              <span className="engine-status-primary">
                Phase {gameState.turn.phase}
              </span>
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
              <button
                type="button"
                onClick={onNextPhase}
                disabled={!controlState.canNextPhase}
              >
                Next Phase
              </button>
              <button
                type="button"
                onClick={onEndTurn}
                disabled={!controlState.canEndTurn}
              >
                End Turn
              </button>
              <button
                type="button"
                onClick={onDrawRune}
                disabled={!controlState.canDrawRune}
              >
                Draw Rune
              </button>
              <button
                type="button"
                onClick={onConfirmMulligan}
                disabled={!controlState.canConfirmMulligan}
              >
                Confirm Mulligan
              </button>
            </div>
            {statusMessage && <p className="engine-message">{statusMessage}</p>}
            {gameState.game.gameOver && (
              <p className="game-over-message">{winnerText}</p>
            )}
          </div>
          <div className="divider-line" />
        </div>
        <PlayerPlaymat
          perspective="you"
          gameState={gameState}
          isLoadingCards={isLoadingCards}
          playableCardIds={playableCardIds}
          legalDropZoneIds={legalDropZoneIds}
        />
      </section>
    </main>
  );
}

export default Board;
