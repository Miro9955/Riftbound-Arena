import type { GameState } from "../gameState";
import { TurnPhase } from "../gameState";

export class TurnManager {
  static endTurn(state: GameState): GameState {
    return this.nextTurn(state);
  }

  static startFirstTurn(state: GameState): GameState {
    const activePlayerId = state.setup.firstPlayerId ?? state.turn.playerOrder[0];
    const activePlayer = state.players[activePlayerId];

    // Core Rules 110-118 and 300-306: after setup and mulligans, the first player starts turn one.
    return {
      ...state,
      hand: activePlayer?.hand ?? state.hand,
      players: activePlayer
        ? this.resetPlayerForTurn(state.players, activePlayerId)
        : state.players,
      setup: {
        ...state.setup,
        status: "COMPLETE",
        startOfGameCompletedPlayerIds: state.turn.playerOrder,
      },
      turn: {
        ...state.turn,
        activePlayerId,
        turnNumber: 1,
        phase: TurnPhase.TURN_START,
      },
    };
  }

  static nextPhase(state: GameState): GameState {
    if (state.turn.phase === TurnPhase.MULLIGAN && state.setup.mulliganComplete) {
      return this.startFirstTurn(state);
    }

    if (state.turn.phase === TurnPhase.END) {
      return this.nextTurn(state);
    }

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

    // Core Rules 300-306: turn order repeats and the next player becomes active at turn start.
    return {
      ...state,
      hand: activePlayer?.hand ?? state.hand,
      players: activePlayer
        ? this.resetPlayerForTurn(state.players, activePlayerId)
        : state.players,
      turn: {
        ...state.turn,
        activePlayerId,
        turnNumber: nextTurnNumber,
        phase: TurnPhase.TURN_START,
      },
    };
  }

  private static resetPlayerForTurn(
    players: GameState["players"],
    activePlayerId: string,
  ) {
    const activePlayer = players[activePlayerId];

    return {
      ...players,
      [activePlayerId]: {
        ...activePlayer,
        // Core Rules 314-317: per-turn draw/action flags reset as the player starts a new turn.
        // TODO(Core Rules 314-315.3): replace this placeholder with ready/beginning/channel reset handling when those systems exist.
        hasDrawn: false,
        actionsRemaining: 1,
      },
    };
  }

  private static getNextPhase(phase: TurnPhase) {
    switch (phase) {
      case TurnPhase.GAME_START:
        return TurnPhase.MULLIGAN;
      case TurnPhase.MULLIGAN:
        return TurnPhase.TURN_START;
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
