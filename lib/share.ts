import { sleeveMeta } from "@/lib/sleeveIndex";
import { TOTAL_SECONDS } from "@/constants";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sleeves.catra.fyi"
).replace(/\/$/, "");

/** The page a shared sleeve lands on: its own second, its own sound. */
export function sleeveUrl(tokenId: number): string {
  return `${SITE_URL}/pressed/${tokenId}`;
}

/** Sleeves are numbered by the second they play, not by token id. */
export function sleeveSecond(tokenId: number): number {
  return sleeveMeta(tokenId)?.second ?? tokenId;
}

export function trackTime(second: number): string {
  const offset = second - 1;
  return `${Math.floor(offset / 60)}:${String(offset % 60).padStart(2, "0")}`;
}

/** `mine` changes the claim, not the pitch: a press is worth saying out loud. */
export function shareText(tokenId: number, mine: boolean): string {
  const second = sleeveSecond(tokenId);
  return mine
    ? `i pressed sleeve #${second} of ${TOTAL_SECONDS}. one second of 4′33″, generated onchain and saved there forever. it plays at ${trackTime(second)}.`
    : `sleeve #${second} of ${TOTAL_SECONDS}. one second of 4′33″, generated onchain and saved there forever. it plays at ${trackTime(second)}.`;
}

export function farcasterComposeUrl(text: string, url: string): string {
  return `https://farcaster.xyz/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
}

export function xComposeUrl(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}
