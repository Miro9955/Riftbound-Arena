import type { GameState } from "../gameState";
import { TurnPhase } from "../gameState";

export class TurnManager {
  static endTurn(state: GameState): GameState {
    return this.nextTurn(state);
  }

  static nextPhase(state: GameState): GameState {
    return {
      ...state,
      turn: {
        ...state.turn,
        phase: this.getNextPhase(state.turn.phase),
      },
    };
  }

  static nextTurn(state: GameState): GameState {
    const playerOrder =
      state.turn.playerOrder.length > 0 ? state.turn.playerOrder : [state.turn.activePlayerId];
    const currentIndex = playerOrder.indexOf(state.turn.activePlayerId);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % playerOrder.length : 0;
    const activePlayerId = playerOrder[nextIndex];
    const nextTurnNumber = state.turn.turnNumber + 1;
    const activePlayer = state.players[activePlayerId];

    return {
      ...state,
      players: activePlayer
        ? {
            ...state.players,
            [activePlayerId]: {
              ...activePlayer,
              hasDrawn: false,
              actionsRemaining: 1,
            },
          }
        : state.players,
      turn: {
        ...state.turn,
        activePlayerId,
        turnNumber: nextTurnNumber,
        phase: TurnPhase.TURN_START,
      },
    };
  }

  private static getNextPhase(phase: TurnPhase) {
    switch (phase) {
      case TurnPhase.GAME_START:
        return TurnPhase.MULLIGAN;
      case TurnPhase.MULLIGAN:
        return TurnPhase.CHOOSE_FIRST_PLAYER;
      case TurnPhase.CHOOSE_FIRST_PLAYER:
        return TurnPhase.TURN_START;
      case TurnPhase.TURN_START:
        return TurnPhase.DRAW;
      case TurnPhase.DRAW:
        return TurnPhase.MAIN;
      case TurnPhase.MAIN:
        return TurnPhase.END;
      case TurnPhase.END:
        return TurnPhase.TURN_START;
    }
  }
}
