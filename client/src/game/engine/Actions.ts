import type { ZoneId } from "../gameState";

export type DrawCardAction = {
  type: "drawCard";
  playerId: string;
};

export type PlayCardAction = {
  type: "playCard";
  playerId: string;
  cardInstanceId: string;
  zoneId: ZoneId;
};

export type MoveCardAction = {
  type: "moveCard";
  cardInstanceId: string;
  zoneId: ZoneId;
};

export type DiscardCardAction = {
  type: "discardCard";
  cardInstanceId: string;
};

export type ReturnCardToHandAction = {
  type: "returnCardToHand";
  cardInstanceId: string;
};

export type ShuffleDeckAction = {
  type: "shuffleDeck";
  playerId: string;
};

export type EndTurnAction = {
  type: "endTurn";
};

export type GameAction =
  | DrawCardAction
  | PlayCardAction
  | MoveCardAction
  | DiscardCardAction
  | ReturnCardToHandAction
  | ShuffleDeckAction
  | EndTurnAction;
