export type CardKind =
  | "unit"
  | "gear"
  | "spell"
  | "rune"
  | "champion"
  | "battlefield";

export type GameCard = {
  id: string;
  cardDefinitionId?: string;
  name: string;
  kind: CardKind;
  supertype?: string | null;
  cost: number;
  power: number;
  health: number;
  text: string;
  color: "gold" | "blue" | "green" | "purple" | "red";
  domains?: string[];
  tags?: string[];
  maxCopies?: number | null;
  imageUrl?: string;
};

export const testCards: GameCard[] = [
  {
    id: "bf-sword",
    name: "B.F. Sword",
    kind: "gear",
    cost: 4,
    power: 3,
    health: 0,
    text: "Equip. Attach this to a unit you control. It certainly is big.",
    color: "gold",
  },
  {
    id: "vi-peacekeeper",
    name: "Vi",
    kind: "unit",
    cost: 5,
    power: 5,
    health: 5,
    text: "Ambush. When I attack, stun an enemy unit here.",
    color: "gold",
  },
  {
    id: "sharpsight",
    name: "Sharpsight",
    kind: "spell",
    cost: 1,
    power: 0,
    health: 0,
    text: "Give a unit +1 power and guard until end of turn.",
    color: "blue",
  },
  {
    id: "inspiring-light",
    name: "Inspiring Light",
    kind: "rune",
    cost: 2,
    power: 0,
    health: 0,
    text: "Ready one of your exhausted units.",
    color: "green",
  },
  {
    id: "vanguard-defender",
    name: "Vanguard Defender",
    kind: "unit",
    cost: 3,
    power: 2,
    health: 4,
    text: "Guard. Allied champions at this battlefield get +1 health.",
    color: "red",
  },
];
