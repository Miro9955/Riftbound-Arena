import type { GameCard } from "../../data/cards";
import type { GameState, ZoneId } from "../gameState";
import type { EffectType } from "./Effects";
import type { TriggerType } from "./Triggers";

export type AbilityId = string;

export type AbilitySource = {
  cardInstanceId?: string;
  playerId?: string;
};

export type AbilityTarget = {
  cardInstanceId?: string;
  playerId?: string;
  zoneId?: ZoneId;
};

export type AbilityTriggerDefinition = {
  type: TriggerType;
  conditions?: AbilityCondition[];
};

export type AbilityCondition =
  | {
      type: "SOURCE_IS_CARD";
      cardInstanceId: string;
    }
  | {
      type: "CONTROLLER_IS_PLAYER";
      playerId: string;
    }
  | {
      type: "TARGET_ZONE_IS";
      zoneId: ZoneId;
    };

export type AbilityEffectDefinition =
  | {
      type: typeof EffectType.DRAW_CARD;
      playerId?: string;
      amount?: number;
    }
  | {
      type: typeof EffectType.DEAL_DAMAGE;
      target?: AbilityTarget;
      amount: number;
    }
  | {
      type: typeof EffectType.HEAL;
      target?: AbilityTarget;
      amount: number;
    }
  | {
      type: typeof EffectType.MOVE_CARD;
      target?: AbilityTarget;
      zoneId: ZoneId;
    }
  | {
      type: typeof EffectType.GAIN_POWER | typeof EffectType.LOSE_POWER;
      target?: AbilityTarget;
      amount: number;
      duration?: "THIS_TURN" | "PERMANENT";
    }
  | {
      type: typeof EffectType.CREATE_TOKEN;
      token: GameCard;
      zoneId: ZoneId;
    }
  | {
      type: typeof EffectType.EXHAUST | typeof EffectType.READY;
      target?: AbilityTarget;
    }
  | {
      type: typeof EffectType.MODIFY_STAT;
      target?: AbilityTarget;
      stat: "cost" | "power" | "health";
      amount: number;
      duration?: "THIS_TURN" | "PERMANENT";
    };

export type AbilityDefinition = {
  id: AbilityId;
  name: string;
  text?: string;
  source?: AbilitySource;
  trigger?: AbilityTriggerDefinition;
  effects: AbilityEffectDefinition[];
};

export type AbilityExecutionContext = {
  state: GameState;
  source?: AbilitySource;
  target?: AbilityTarget;
  playerId?: string;
};

export type TriggerExecutionContext = AbilityExecutionContext & {
  triggerType: TriggerType;
};

export type AbilityExecutionResult = {
  state: GameState;
};

export const demoAbility: AbilityDefinition = {
  id: "demo-draw-on-play",
  name: "Demo Draw On Play",
  text: "Example only: when this ability triggers on play, draw a card.",
  trigger: {
    type: "ON_PLAY",
  },
  effects: [
    {
      type: "DRAW_CARD",
      amount: 1,
    },
  ],
};
