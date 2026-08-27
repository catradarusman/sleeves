import indexJson from "./sleeve-index.json";

export type SleeveMeta = {
  /** Position in the 4′33″, from the sleeve's own "Second" trait. */
  second: number;
  image: string;
  name: string;
};

// Sleeve metadata is immutable once minted, so it is checked in rather than
// fetched 273 times at runtime. Regenerate after a new mint:
//   node scripts/build-sleeve-index.mjs
const SLEEVE_INDEX = indexJson as Record<string, SleeveMeta>;

export function sleeveMeta(tokenId: number): SleeveMeta | null {
  return SLEEVE_INDEX[String(tokenId)] ?? null;
}

/** The second a token plays at. The ERC721 id is not the position. */
export function secondOf(tokenId: number): number | null {
  return sleeveMeta(tokenId)?.second ?? null;
}

export function sleeveLabel(tokenId: number): string {
  const meta = sleeveMeta(tokenId);
  return meta ? `#${meta.second}` : `token #${tokenId}`;
}

export const INDEXED_TOKENS = Object.keys(SLEEVE_INDEX).map(Number);
