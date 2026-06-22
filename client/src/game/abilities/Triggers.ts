export const TriggerType = {
  ON_PLAY: "ON_PLAY",
  ON_ATTACK: "ON_ATTACK",
  ON_DAMAGE: "ON_DAMAGE",
  ON_DESTROY: "ON_DESTROY",
  ON_DRAW: "ON_DRAW",
  ON_DISCARD: "ON_DISCARD",
  TURN_START: "TURN_START",
  TURN_END: "TURN_END",
} as const;

export type TriggerType = (typeof TriggerType)[keyof typeof TriggerType];
