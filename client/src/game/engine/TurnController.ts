import type { GameState } from "../gameState";
import { TurnPhase } from "../gameState";
import { CardManager } from "./CardManager";
import { TurnManager } from "./TurnManager";

export class TurnController {
  static nextPhase(state: GameState) {
    const nextState = TurnManager.nextPhase(state);

    // Core Rules 315.4 and 400: the active player draws once when the draw phase begins.
    if (
      state.turn.phase !== TurnPhase.DRAW &&
      nextState.turn.phase === TurnPhase.DRAW &&
      !nextState.players[nextState.turn.activePlayerId]?.hasDrawn
    ) {
      const drawResult = CardManager.drawFromDeck(
        nextState,
        nextState.turn.activePlayerId,
      );

      return {
        state: drawResult.state,
        drawnCard: drawResult.card,
      };
    }

    return {
      state: nextState,
      drawnCard: undefined,
    };
  }

  static nextTurn(state: GameState) {
    return TurnManager.nextTurn(state);
  }
}
