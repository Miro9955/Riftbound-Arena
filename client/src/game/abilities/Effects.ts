export const EffectType = {
  DRAW_CARD: "DRAW_CARD",
  DEAL_DAMAGE: "DEAL_DAMAGE",
  HEAL: "HEAL",
  MOVE_CARD: "MOVE_CARD",
  GAIN_POWER: "GAIN_POWER",
  LOSE_POWER: "LOSE_POWER",
  CREATE_TOKEN: "CREATE_TOKEN",
  EXHAUST: "EXHAUST",
  READY: "READY",
  MODIFY_STAT: "MODIFY_STAT",
} as const;

export type EffectType = (typeof EffectType)[keyof typeof EffectType];
