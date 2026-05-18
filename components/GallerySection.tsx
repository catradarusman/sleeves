"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import GalleryPlayer from "@/components/GalleryPlayer";
import { TOTAL_SECONDS } from "@/constants";
import { getAllPressedSeconds, getTotalPressed, getTokensOwnedBy } from "@/lib/sleeves";
import type { PressedSecond } from "@/lib/sleeves";

const MOCK_PRESSED: PressedSecond[] = [
  {
    tokenId: 1,
    holderAddress: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    ensName: "vitalik.eth",
    pressedAt: 1715000000,
    hasAudio: true,
  },
  {
    tokenId: 17,
    holderAddress: "0x1234567890abcdef1234567890abcdef12345678",
    ensName: null,
    pressedAt: 1715100000,
    hasAudio: true,
  },
  {
    tokenId: 42,
    holderAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    ensName: "catra.eth",
    pressedAt: 1715200000,
    hasAudio: false,
  },
  {
    tokenId: 99,
    holderAddress: "0x9999999999999999999999999999999999999999",
    ensName: null,
    pressedAt: 1715300000,
    hasAudio: true,
  },
  {
    tokenId: 200,
    holderAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ensName: null,
    pressedAt: 1715400000,
    hasAudio: true,
  },
];

async function fetchGalleryData() {
  const [pressedSeconds, totalPressed] = await Promise.all([
    getAllPressedSeconds(),
    getTotalPressed(),
  ]);
  return { pressedSeconds, totalPressed };
}

export default function GallerySection({ onPressCTA }: { onPressCTA?: (tokenId: number) => void }) {
  const { address } = useAccount();

  const { data, isError } = useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGalleryData,
    refetchInterval: 30_000,
    placeholderData: { pressedSeconds: MOCK_PRESSED, totalPressed: MOCK_PRESSED.length },
  });

  const pressedSeconds = data?.pressedSeconds ?? MOCK_PRESSED;
  const totalPressed = data?.totalPressed ?? MOCK_PRESSED.length;
  const usingMock = isError || pressedSeconds === MOCK_PRESSED;

  const pressedSet = new Set(pressedSeconds.map((s) => s.tokenId));

  const { data: unpressedIds } = useQuery<number[]>({
    queryKey: ["holderUnpressed", address, totalPressed],
    queryFn: async () => {
      const owned = await getTokensOwnedBy(address!);
      return owned.filter((id) => !pressedSet.has(id));
    },
    enabled: !!address,
  });

  useEffect(() => {
    if (unpressedIds && unpressedIds.length > 0) {
      import("../lib/audio").then((m) => m.preloadEncoder());
    }
  }, [unpressedIds]);

  return (
    <>
      <div className="mb-6">
        <div className="relative h-px bg-white/10 mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-white/60"
            style={{ width: `${(totalPressed / TOTAL_SECONDS) * 100}%` }}
          />
          {totalPressed < 260 && (
            <div
              className="absolute inset-y-0 w-px bg-white/20"
              style={{ left: `${(260 / TOTAL_SECONDS) * 100}%` }}
            />
          )}
        </div>
        <div className="flex justify-between items-baseline">
          <p className="text-label font-mono text-white/40 tabular-nums">
            {totalPressed} of {TOTAL_SECONDS} pressed
          </p>
          <div className="flex items-baseline gap-3">
            {totalPressed >= 260 && (
              <p className="text-caption text-meta">
                {TOTAL_SECONDS - totalPressed} left
              </p>
            )}
            {totalPressed < 260 && (
              <p className="text-caption text-white/20">
                260 — airdrop
              </p>
            )}
            <a
              href="https://highlight.xyz/mint/base:0x4428be530724b5ee47e4cb0061f77024933a4dc3"
              target="_blank" rel="noopener noreferrer"
              className="text-caption text-white/30 hover:text-white/50 transition-colors"
            >
              get a sleeve →
            </a>
          </div>
        </div>
      </div>

      {unpressedIds && unpressedIds.length > 0 && (
        <div className="border border-white/10 rounded p-4 mb-6">
          <p className="text-caption text-meta mb-1">sleeve #{unpressedIds[0]}</p>
          <p className="text-body text-white/60 mb-3">
            {unpressedIds.length === 1
              ? "your second hasn't been pressed yet"
              : `you have ${unpressedIds.length} seconds waiting`}
          </p>
          {onPressCTA ? (
            <button
              onClick={() => onPressCTA(unpressedIds[0])}
              className="text-body text-white hover:text-white/70 transition-colors"
            >
              press →
            </button>
          ) : (
            <a
              href={unpressedIds.length === 1 ? `/press/${unpressedIds[0]}` : "/press"}
              className="text-body text-white hover:text-white/70 transition-colors"
            >
              press →
            </a>
          )}
        </div>
      )}

      <GalleryPlayer pressedSeconds={pressedSeconds} totalPressed={totalPressed} />

      {usingMock && (
        <p className="mt-4 text-caption text-meta text-center">
          mock data — contract reads unavailable
        </p>
      )}
    </>
  );
}
