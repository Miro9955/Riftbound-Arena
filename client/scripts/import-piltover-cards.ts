import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "https://piltoverarchive.com/api/external/v1/cards";
const LIMIT = 100;
const REQUEST_DELAY_MS = 250;

type PiltoverApiColor = {
  id: string;
  name: string;
  hexCode: string | null;
};

type PiltoverApiCard = {
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
  banEffectiveDate: string | null;
  colors: PiltoverApiColor[];
};

type PiltoverApiVariant = {
  id: string;
  variantNumber: string;
  rarity: string | null;
  variantType: string | null;
  foilMode: string | null;
  variantTypes: string[];
  imageUrl: string | null;
  flavorText: string | null;
  artist: string | null;
  releaseDate: string | null;
  variantLabel: string | null;
  showInLibrary: boolean;
  isCollectible: boolean;
  parentVariantId: string | null;
  set: {
    id: string;
    name: string;
    prefix: string;
    releaseDate: string | null;
  };
  card: PiltoverApiCard;
};

type PiltoverApiResponse = {
  data: PiltoverApiVariant[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

type ImportedPiltoverCard = {
  variantId: string;
  variantNumber: string;
  rarity: string | null;
  variantType: string | null;
  foilMode: string | null;
  variantTypes: string[];
  imageUrl: string | null;
  flavorText: string | null;
  artist: string | null;
  releaseDate: string | null;
  variantLabel: string | null;
  showInLibrary: boolean;
  isCollectible: boolean;
  parentVariantId: string | null;
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
    banEffectiveDate: string | null;
    colors: PiltoverApiColor[];
  };
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toMetadataOnly(variant: PiltoverApiVariant): ImportedPiltoverCard {
  return {
    variantId: variant.id,
    variantNumber: variant.variantNumber,
    rarity: variant.rarity,
    variantType: variant.variantType,
    foilMode: variant.foilMode,
    variantTypes: variant.variantTypes,
    imageUrl: variant.imageUrl,
    flavorText: variant.flavorText,
    artist: variant.artist,
    releaseDate: variant.releaseDate,
    variantLabel: variant.variantLabel,
    showInLibrary: variant.showInLibrary,
    isCollectible: variant.isCollectible,
    parentVariantId: variant.parentVariantId,
    set: variant.set,
    card: {
      id: variant.card.id,
      name: variant.card.name,
      type: variant.card.type,
      super: variant.card.super,
      description: variant.card.description,
      energy: variant.card.energy,
      might: variant.card.might,
      power: variant.card.power,
      tags: variant.card.tags,
      attachText: variant.card.attachText,
      effect: variant.card.effect,
      mightBonus: variant.card.mightBonus,
      maxCopies: variant.card.maxCopies,
      banEffectiveDate: variant.card.banEffectiveDate,
      colors: variant.card.colors.map(({ id, name, hexCode }) => ({
        id,
        name,
        hexCode,
      })),
    },
  };
}

async function fetchPage(page: number): Promise<PiltoverApiResponse> {
  const url = new URL(API_URL);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(LIMIT));

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Piltover Archive request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<PiltoverApiResponse>;
}

async function main() {
  const cards: ImportedPiltoverCard[] = [];
  let page = 1;
  let totalPages = 1;
  let total = 0;

  do {
    const result = await fetchPage(page);

    cards.push(...result.data.map(toMetadataOnly));
    total = result.pagination.total;
    totalPages = result.pagination.totalPages;

    console.log(`Fetched page ${page}/${totalPages} (${cards.length}/${total})`);

    page += 1;
    if (page <= totalPages) {
      await delay(REQUEST_DELAY_MS);
    }
  } while (page <= totalPages);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(scriptDir, "../public/cards/piltover-cards.json");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        source: API_URL,
        importedAt: new Date().toISOString(),
        count: cards.length,
        cards,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`Saved metadata for ${cards.length} cards to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
