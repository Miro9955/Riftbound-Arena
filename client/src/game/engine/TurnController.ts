import type { GameState } from "../gameState";
import { TurnPhase } from "../gameState";
import { CardManager } from "./CardManager";
import { TurnManager } from "./TurnManager";

export class TurnController {
  static nextPhase(state: GameState) {
    const nextState = TurnManager.nextPhase(state);

    if (nextState.turn.phase === TurnPhase.DRAW) {
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
