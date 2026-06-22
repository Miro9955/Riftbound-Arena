import type { CardKind, GameCard } from "../data/cards";

const CARD_DATABASE_URL = "/cards/piltover-cards.json";

export type PiltoverColor = {
  id: string;
  name: string;
  hexCode: string | null;
};

export type PiltoverImportedCard = {
  variantId: string;
  variantNumber: string;
  rarity: string | null;
  variantType: string | null;
  imageUrl: string | null;
  flavorText: string | null;
  set: {
    id: string;
    name: string;
    prefix: string;
    releaseDate: string | null;
  };
  card: {
    id: string;
    name: string;
    type: string;
    super: string | null;
    description: string | null;
    energy: number | null;
    might: number | null;
    power: number | null;
    tags: string[];
    attachText: string | null;
    effect: string | null;
    mightBonus: number | null;
    maxCopies: number | null;
    colors: PiltoverColor[];
  };
};

type PiltoverCardsFile = {
  source: string;
  importedAt: string;
  count: number;
  cards: PiltoverImportedCard[];
};

export type CardFilters = {
  kinds?: CardKind[];
  colors?: GameCard["color"][];
  minCost?: number;
  maxCost?: number;
};

let cardsCache: GameCard[] | null = null;
let cardsById = new Map<string, GameCard>();
let loadPromise: Promise<GameCard[]> | null = null;

function mapPiltoverKind(type: string): CardKind {
  switch (type.toLowerCase()) {
    case "unit":
      return "unit";
    case "gear":
      return "gear";
    case "spell":
      return "spell";
    case "rune":
      return "rune";
    case "battlefield":
      return "battlefield";
    default:
      return "champion";
  }
}

function mapPiltoverColor(colors: PiltoverColor[]): GameCard["color"] {
  const primaryColor = colors[0]?.name.toLowerCase();

  switch (primaryColor) {
    case "fury":
      return "red";
    case "calm":
      return "green";
    case "mind":
      return "blue";
    case "chaos":
      return "purple";
    case "body":
    case "order":
    default:
      return "gold";
  }
}

function getPiltoverText(card: PiltoverImportedCard) {
  const textParts = [
    card.card.attachText,
    card.card.description,
    card.card.effect,
    card.flavorText,
  ].filter(Boolean);

  return textParts.join("\n\n") || "No rules text.";
}

export function mapPiltoverCardToGameCard(card: PiltoverImportedCard): GameCard {
  return {
    id: card.variantId,
    cardDefinitionId: card.card.id,
    name: card.card.name,
    kind: mapPiltoverKind(card.card.type),
    supertype: card.card.super,
    cost: card.card.energy ?? 0,
    power: card.card.might ?? card.card.mightBonus ?? 0,
    health: card.card.power ?? 0,
    text: getPiltoverText(card),
    color: mapPiltoverColor(card.card.colors),
    domains: card.card.colors.map((color) => color.name),
    tags: card.card.tags,
    maxCopies: card.card.maxCopies,
    imageUrl: card.imageUrl ?? undefined,
  };
}

function setCardsCache(cards: GameCard[]) {
  cardsCache = cards;
  cardsById = new Map(cards.map((card) => [card.id, card]));
}

export async function loadCards() {
  if (cardsCache) {
    return cardsCache;
  }

  loadPromise ??= fetch(CARD_DATABASE_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load card database: ${response.status}`);
      }

      return response.json() as Promise<PiltoverCardsFile>;
    })
    .then((database) => {
      const cards = database.cards.map(mapPiltoverCardToGameCard);
      setCardsCache(cards);
      return cards;
    })
    .catch((error) => {
      loadPromise = null;
      throw error;
    });

  return loadPromise;
}

export function getCard(id: string) {
  return cardsById.get(id);
}

export function getCards() {
  return cardsCache ?? [];
}

export function searchCards(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return getCards();
  }

  return getCards().filter((card) =>
    [card.name, card.kind, card.text].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    ),
  );
}

export function filterCards(filters: CardFilters) {
  return getCards().filter((card) => {
    if (filters.kinds?.length && !filters.kinds.includes(card.kind)) {
      return false;
    }

    if (filters.colors?.length && !filters.colors.includes(card.color)) {
      return false;
    }

    if (filters.minCost !== undefined && card.cost < filters.minCost) {
      return false;
    }

    if (filters.maxCost !== undefined && card.cost > filters.maxCost) {
      return false;
    }

    return true;
  });
}
