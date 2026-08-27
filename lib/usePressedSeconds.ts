"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllPressedSeconds, getTotalPressed } from "@/lib/sleeves";

async function fetchGalleryData() {
  const [pressedSeconds, totalPressed] = await Promise.all([
    getAllPressedSeconds(),
    getTotalPressed(),
  ]);
  return { pressedSeconds, totalPressed };
}

export function usePressedSeconds() {
  return useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGalleryData,
    refetchInterval: 60_000,
    // Fail fast and say so, rather than spinning through long backoff.
    retry: 1,
    // navigator.onLine lies often enough that pausing here leaves the surface
    // stuck on "reading Base" forever. Always try, then report what happened.
    networkMode: "always",
  });
}
