import type { GameCard } from "../../data/cards";
import type { GameState } from "../gameState";

export class CardManager {
  static findCard(state: GameState, cardInstanceId: string) {
    return (
      state.hand.find((card) => card.id === cardInstanceId) ??
      Object.values(state.zones)
        .flat()
        .find((card) => card.id === cardInstanceId)
    );
  }

  static setPlayerDeck(
    state: GameState,
    playerId: string,
    deck: GameCard[],
  ): GameState {
    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          runeDeck: state.players[playerId]?.runeDeck ?? [],
          hand: state.players[playerId]?.hand ?? [],
          trash: state.players[playerId]?.trash ?? [],
          banishment: state.players[playerId]?.banishment ?? [],
          base: state.players[playerId]?.base ?? [],
          championLegend: state.players[playerId]?.championLegend,
          chosenChampion: state.players[playerId]?.chosenChampion,
          setup: state.players[playerId]?.setup ?? {
            deckValidated: false,
            startingHandDrawn: false,
            mulliganPending: false,
            mulliganCompleted: false,
          },
          hasMulliganed: state.players[playerId]?.hasMulliganed ?? false,
          hasDrawn: state.players[playerId]?.hasDrawn ?? false,
          actionsRemaining: state.players[playerId]?.actionsRemaining ?? 0,
          deck,
        },
      },
    };
  }

  static drawFromDeck(state: GameState, playerId: string) {
    const player = state.players[playerId];

    if (!player || player.deck.length === 0) {
      return { state, card: undefined };
    }

    const [card, ...deck] = player.deck;

    return {
      card,
      state: {
        ...state,
        hand: playerId === state.turn.activePlayerId ? [...state.hand, card] : state.hand,
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            hand: [...player.hand, card],
            hasDrawn: true,
            deck,
          },
        },
      },
    };
  }

  static shuffleDeck(state: GameState, playerId: string): GameState {
    const player = state.players[playerId];

    if (!player) {
      return state;
    }

    const deck = [...player.deck];

    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }

    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...player,
          deck,
        },
      },
    };
  }
}
