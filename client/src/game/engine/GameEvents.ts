import type { GameCard } from "../../data/cards";
import type {
  BattlefieldId,
  DeckValidationError,
  TurnPhase,
  ZoneId,
} from "../gameState";

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

export type UnitMoved = {
  type: "UnitMoved";
  playerId: string;
  cardInstanceId: string;
  fromZoneId: ZoneId;
  toZoneId: BattlefieldId;
};

export type BattlefieldControlChanged = {
  type: "BattlefieldControlChanged";
  battlefieldId: BattlefieldId;
  previousControllerId?: string;
  controllerId?: string;
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

export type RuneDrawn = {
  type: "RuneDrawn";
  playerId: string;
  card: GameCard;
};

export type RuneChanneled = {
  type: "RuneChanneled";
  playerId: string;
  card: GameCard;
};

export type RuneSpent = {
  type: "RuneSpent";
  playerId: string;
  amount: number;
};

export type RuneRecycled = {
  type: "RuneRecycled";
  playerId: string;
  card: GameCard;
};

export type RunesReset = {
  type: "RunesReset";
  playerId: string;
};

export type GameEvent =
  | CardDrawn
  | CardMoved
  | CardPlayed
  | UnitMoved
  | BattlefieldControlChanged
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
  | MulliganCompleted
  | RuneDrawn
  | RuneChanneled
  | RuneSpent
  | RuneRecycled
  | RunesReset;

export type GameEventListener = (event: GameEvent) => void;
