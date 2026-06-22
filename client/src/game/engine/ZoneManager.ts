import type { GameCard } from "../../data/cards";
import type { GameState, ZoneId } from "../gameState";
import { emptyZones } from "../gameState";

export class ZoneManager {
  static removeCard(state: GameState, cardInstanceId: string): GameState {
    return {
      ...state,
      hand: state.hand.filter((card) => card.id !== cardInstanceId),
      zones: {
        battlefield1: state.zones.battlefield1.filter(
          (card) => card.id !== cardInstanceId,
        ),
        battlefield2: state.zones.battlefield2.filter(
          (card) => card.id !== cardInstanceId,
        ),
        base: state.zones.base.filter((card) => card.id !== cardInstanceId),
        trash: state.zones.trash.filter((card) => card.id !== cardInstanceId),
        channeledRunes: state.zones.channeledRunes.filter(
          (card) => card.id !== cardInstanceId,
        ),
      },
    };
  }

  static addCardToZone(state: GameState, card: GameCard, zoneId: ZoneId): GameState {
    return {
      ...state,
      zones: {
        ...state.zones,
        [zoneId]: [...state.zones[zoneId], card],
      },
    };
  }

  static addCardToHand(state: GameState, card: GameCard): GameState {
    return {
      ...state,
      hand: [...state.hand, card],
    };
  }

  static createEmptyZones() {
    return emptyZones();
  }
}
