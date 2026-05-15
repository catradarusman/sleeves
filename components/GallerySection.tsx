"use client";

import { useQuery } from "@tanstack/react-query";
import GalleryPlayer from "@/components/GalleryPlayer";
import { TOTAL_SECONDS } from "@/constants";
import { getAllPressedSeconds, getTotalPressed } from "@/lib/sleeves";
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

export default function GallerySection() {
  const { data, isError } = useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGalleryData,
    refetchInterval: 30_000,
    placeholderData: { pressedSeconds: MOCK_PRESSED, totalPressed: MOCK_PRESSED.length },
  });

  const pressedSeconds = data?.pressedSeconds ?? MOCK_PRESSED;
  const totalPressed = data?.totalPressed ?? MOCK_PRESSED.length;
  const usingMock = isError || pressedSeconds === MOCK_PRESSED;

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="text-xs text-white/40 tabular-nums">
          {totalPressed} of {TOTAL_SECONDS} pressed
        </span>
      </div>

      <GalleryPlayer pressedSeconds={pressedSeconds} totalPressed={totalPressed} />

      {usingMock && (
        <p className="mt-4 text-xs text-white/20 text-center">
          mock data — contract reads unavailable
        </p>
      )}
    </>
  );
}
