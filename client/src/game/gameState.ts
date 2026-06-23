import type { GameCard } from "../data/cards";

export type ZoneId =
  | "battlefield1"
  | "battlefield2"
  | "base"
  | "trash"
  | "channeledRunes";

export type DropZoneId = ZoneId | "hand";
export type BattlefieldId = Extract<ZoneId, "battlefield1" | "battlefield2">;

export type GameState = {
  hand: GameCard[];
  zones: Record<ZoneId, GameCard[]>;
  battlefields: Record<BattlefieldId, BattlefieldState>;
  unitDamage: Record<string, number>;
  exhaustedUnitIds: string[];
  players: Record<string, PlayerState>;
  turn: TurnState;
  setup: SetupState;
};

export type BattlefieldState = {
  controllerId?: string;
  unitControllers: Record<string, string>;
};

export type PlayerState = {
  deck: GameCard[];
  runeDeck: GameCard[];
  channeledRunes: GameCard[];
  exhaustedRuneIds: string[];
  runePool: RunePoolState;
  hand: GameCard[];
  trash: GameCard[];
  banishment: GameCard[];
  base: GameCard[];
  championLegend?: GameCard;
  chosenChampion?: GameCard;
  setup: PlayerSetupState;
  hasMulliganed: boolean;
  hasDrawn: boolean;
  actionsRemaining: number;
};

export type RunePoolState = {
  available: number;
  spent: number;
};

export type PlayerSetupState = {
  deckValidated: boolean;
  startingHandDrawn: boolean;
  mulliganPending: boolean;
  mulliganCompleted: boolean;
};

export type SetupStatus =
  | "NOT_STARTED"
  | "VALIDATING_DECKS"
  | "DRAWING_STARTING_HANDS"
  | "MULLIGAN_PENDING"
  | "COMPLETE";

export type SetupState = {
  status: SetupStatus;
  decksValidated: boolean;
  firstPlayerId?: string;
  mulliganPlayerIds: string[];
  currentMulliganPlayerId?: string;
  completedMulliganPlayerIds: string[];
  mulliganSetAsideCards: Record<string, GameCard[]>;
  mulliganComplete: boolean;
  startOfGameCompletedPlayerIds: string[];
  validationErrors: DeckValidationError[];
};

export type DeckValidationError = {
  playerId: string;
  ruleSection: string;
  code: string;
  message: string;
};

export type TurnState = {
  activePlayerId: string;
  turnNumber: number;
  phase: TurnPhase;
  playerOrder: string[];
};

export const TurnPhase = {
  GAME_START: "GAME_START",
  MULLIGAN: "MULLIGAN",
  CHOOSE_FIRST_PLAYER: "CHOOSE_FIRST_PLAYER",
  TURN_START: "TURN_START",
  DRAW: "DRAW",
  MAIN: "MAIN",
  END: "END",
} as const;

export type TurnPhase = (typeof TurnPhase)[keyof typeof TurnPhase];

export const droppableZoneIds = new Set<ZoneId>([
  "battlefield1",
  "battlefield2",
  "base",
  "trash",
  "channeledRunes",
]);

export const battlefieldZoneIds = new Set<BattlefieldId>([
  "battlefield1",
  "battlefield2",
]);

export const droppableTargetIds = new Set<DropZoneId>([
  ...droppableZoneIds,
  "hand",
]);

export function emptyZones(): Record<ZoneId, GameCard[]> {
  return {
    battlefield1: [],
    battlefield2: [],
    base: [],
    trash: [],
    channeledRunes: [],
  };
}

export function emptyBattlefields(): Record<BattlefieldId, BattlefieldState> {
  return {
    battlefield1: {
      unitControllers: {},
    },
    battlefield2: {
      unitControllers: {},
    },
  };
}

export function createInitialGameState(): GameState {
  return {
    hand: [],
    zones: emptyZones(),
    battlefields: emptyBattlefields(),
    unitDamage: {},
    exhaustedUnitIds: [],
    players: {
      player1: {
        deck: [],
        runeDeck: [],
        channeledRunes: [],
        exhaustedRuneIds: [],
        runePool: {
          available: 0,
          spent: 0,
        },
        hand: [],
        trash: [],
        banishment: [],
        base: [],
        setup: {
          deckValidated: false,
          startingHandDrawn: false,
          mulliganPending: false,
          mulliganCompleted: false,
        },
        hasMulliganed: false,
        hasDrawn: false,
        actionsRemaining: 1,
      },
    },
    turn: {
      activePlayerId: "player1",
      turnNumber: 1,
      phase: TurnPhase.GAME_START,
      playerOrder: ["player1"],
    },
    setup: {
      status: "NOT_STARTED",
      decksValidated: false,
      mulliganPlayerIds: [],
      completedMulliganPlayerIds: [],
      mulliganSetAsideCards: {},
      mulliganComplete: false,
      startOfGameCompletedPlayerIds: [],
      validationErrors: [],
    },
  };
}

export function isDropZoneId(value: string): value is DropZoneId {
  return droppableTargetIds.has(value as DropZoneId);
}

export function isZoneId(value: string): value is ZoneId {
  return droppableZoneIds.has(value as ZoneId);
}

export function isBattlefieldId(value: string): value is BattlefieldId {
  return battlefieldZoneIds.has(value as BattlefieldId);
}

export function removeCardFromState(state: GameState, cardId: string): GameState {
  return {
    ...state,
    hand: state.hand.filter((card) => card.id !== cardId),
    zones: {
      battlefield1: state.zones.battlefield1.filter((card) => card.id !== cardId),
      battlefield2: state.zones.battlefield2.filter((card) => card.id !== cardId),
      base: state.zones.base.filter((card) => card.id !== cardId),
      trash: state.zones.trash.filter((card) => card.id !== cardId),
      channeledRunes: state.zones.channeledRunes.filter((card) => card.id !== cardId),
    },
  };
}

export function findCard(state: GameState, cardId: string) {
  return (
    state.hand.find((card) => card.id === cardId) ??
    Object.values(state.zones)
      .flat()
      .find((card) => card.id === cardId)
  );
}
