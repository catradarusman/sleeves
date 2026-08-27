import { sleeveMeta } from "@/lib/sleeveIndex";
import { TOTAL_SECONDS } from "@/constants";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sleeves.catra.fyi"
).replace(/\/$/, "");

/** The page a shared sleeve lands on: its own second, its own sound. */
export function sleeveUrl(tokenId: number): string {
  return `${SITE_URL}/pressed/${tokenId}`;
}

/** Sleeves are numbered by the second they play, not by token id. Null when
 *  the token is not in the checked-in index yet: the index is rebuilt after a
 *  mint, so a fresh sleeve can be real and absent at the same time. Guessing
 *  the second from the id would put a wrong number on a permanent card. */
export function sleeveSecond(tokenId: number): number | null {
  return sleeveMeta(tokenId)?.second ?? null;
}

/** In range for the collection, whether or not the index knows it yet. */
export function isSleeveId(tokenId: number): boolean {
  return Number.isInteger(tokenId) && tokenId >= 1 && tokenId <= TOTAL_SECONDS;
}

export function trackTime(second: number): string {
  const offset = second - 1;
  return `${Math.floor(offset / 60)}:${String(offset % 60).padStart(2, "0")}`;
}

/** `mine` changes the claim, not the pitch: a press is worth saying out loud. */
export function shareText(tokenId: number, mine: boolean): string {
  const second = sleeveSecond(tokenId);
  const lead = second === null ? `a sleeve of ${TOTAL_SECONDS}` : `sleeve #${second} of ${TOTAL_SECONDS}`;
  const plays = second === null ? "" : ` it plays at ${trackTime(second)}.`;
  const opening = mine ? `i pressed ${lead}` : lead;
  return `${opening}. one second of 4′33″, generated onchain and saved there forever.${plays}`;
}

export function farcasterComposeUrl(text: string, url: string): string {
  return `https://farcaster.xyz/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
}

export function xComposeUrl(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
