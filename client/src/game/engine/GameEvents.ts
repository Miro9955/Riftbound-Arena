import type { GameCard } from "../../data/cards";
import type { DeckValidationError, TurnPhase, ZoneId } from "../gameState";

export type CardDrawn = {
  type: "CardDrawn";
  playerId: string;
  card: GameCard;
};

export type CardMoved = {
  type: "CardMoved";
  cardInstanceId: string;
  zoneId: ZoneId | "hand";
};

export type CardPlayed = {
  type: "CardPlayed";
  playerId: string;
  cardInstanceId: string;
  zoneId: ZoneId;
};

export type CardDiscarded = {
  type: "CardDiscarded";
  cardInstanceId: string;
};

export type TurnEnded = {
  type: "TurnEnded";
  activePlayerId: string;
  turnNumber: number;
};

export type TurnStarted = {
  type: "TurnStarted";
  activePlayerId: string;
  turnNumber: number;
};

export type PhaseChanged = {
  type: "PhaseChanged";
  phase: TurnPhase;
  activePlayerId: string;
  turnNumber: number;
};

export type FirstPlayerChosen = {
  type: "FirstPlayerChosen";
  playerId: string;
};

export type GameSetupStarted = {
  type: "GameSetupStarted";
  playerIds: string[];
};

export type DeckValidated = {
  type: "DeckValidated";
  playerId: string;
};

export type DeckRejected = {
  type: "DeckRejected";
  playerId: string;
  errors: DeckValidationError[];
};

export type DeckShuffled = {
  type: "DeckShuffled";
  playerId: string;
  deck: "main" | "rune";
};

export type TurnOrderDetermined = {
  type: "TurnOrderDetermined";
  playerOrder: string[];
  firstPlayerId: string;
};

export type StartingHandDrawn = {
  type: "StartingHandDrawn";
  playerId: string;
  cards: GameCard[];
};

export type MulliganStarted = {
  type: "MulliganStarted";
  playerIds: string[];
};

export type CardsSetAsideForMulligan = {
  type: "CardsSetAsideForMulligan";
  playerId: string;
  cards: GameCard[];
};

export type CardsRecycled = {
  type: "CardsRecycled";
  playerId: string;
  cards: GameCard[];
};

export type MulliganCompleted = {
  type: "MulliganCompleted";
  playerId: string;
};

export type GameEvent =
  | CardDrawn
  | CardMoved
  | CardPlayed
  | CardDiscarded
  | TurnEnded
  | TurnStarted
  | PhaseChanged
  | FirstPlayerChosen
  | GameSetupStarted
  | DeckValidated
  | DeckRejected
  | DeckShuffled
  | TurnOrderDetermined
  | StartingHandDrawn
  | MulliganStarted
  | CardsSetAsideForMulligan
  | CardsRecycled
  | MulliganCompleted;

export type GameEventListener = (event: GameEvent) => void;
