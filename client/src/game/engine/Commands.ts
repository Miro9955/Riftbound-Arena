import type { ZoneId } from "../gameState";

export type DrawCardCommand = {
  playerId: string;
};

export type PlayCardCommand = {
  playerId: string;
  cardInstanceId: string;
  zoneId: ZoneId;
};

export type MoveCardCommand = {
  cardInstanceId: string;
  zoneId: ZoneId;
};

export type DiscardCardCommand = {
  cardInstanceId: string;
};

export type ReturnCardToHandCommand = {
  cardInstanceId: string;
};

export type ShuffleDeckCommand = {
  playerId: string;
};
