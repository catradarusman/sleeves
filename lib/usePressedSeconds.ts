"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllPressedSeconds, getTotalPressed } from "@/lib/sleeves";
import { fetchSleeveMeta } from "@/lib/sleeveMetaFallback";

async function fetchGalleryData() {
  const [pressedSeconds, totalPressed] = await Promise.all([
    getAllPressedSeconds(),
    getTotalPressed(),
  ]);

  // Sleeves minted since the last index build have no second yet. Read their
  // metadata live so a fresh press is never silently dropped from the surface.
  const unindexed = pressedSeconds.filter((s) => s.second === null).map((s) => s.tokenId);
  if (unindexed.length > 0) {
    const late = await fetchSleeveMeta(unindexed);
    for (const row of pressedSeconds) {
      const meta = late.get(row.tokenId);
      if (meta) {
        row.second = meta.second;
        row.image = meta.image;
      }
    }
  }

  return { pressedSeconds, totalPressed };
}

export function usePressedSeconds() {
  return useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGalleryData,
    refetchInterval: 60_000,
    // Without this every additional component that reads this query refetches
    // the whole gallery on mount, because a staleTime of 0 marks the cached
    // data stale the instant it lands. Those mounts happen in the same render
    // pass, so this only has to be long enough to cover one. Keep it short:
    // nothing invalidates this query after a press, so a longer window would
    // show a returning presser a rack that is missing their own second.
    staleTime: 5_000,
    // Fail fast and say so, rather than spinning through long backoff.
    retry: 1,
    // navigator.onLine lies often enough that pausing here leaves the surface
    // stuck on "reading Base" forever. Always try, then report what happened.
    networkMode: "always",
  });
}
