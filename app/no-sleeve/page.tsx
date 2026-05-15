"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import { getTotalPressed } from "@/lib/sleeves";
import { TOTAL_SECONDS } from "@/constants";

export default function NoSleeve() {
  const { data: totalPressed } = useQuery({
    queryKey: ["totalPressed"],
    queryFn: getTotalPressed,
    refetchInterval: 30_000,
  });

  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-white/90">
            <Link href="/" className="hover:text-white/70 transition-colors">273 Sleeves: Sound</Link>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">4′33″ onchain · Base</p>
        </div>
        <ConnectButton />
      </div>

      <div className="space-y-6 max-w-sm">
        <p className="text-sm text-white">you don&apos;t hold a sleeve.</p>
        <p className="text-xs text-white/50">
          273 seconds of 4′33″ by John Cage, each pressed onchain as a unique sound fragment.
        </p>
        <a
          href="https://highlight.xyz/mint/base:0x4428be530724b5ee47e4cb0061f77024933a4dc3"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-white/60 hover:text-white transition-colors"
        >
          get a sleeve on Highlight →
        </a>
        <p className="text-xs text-white/30 tabular-nums">
          {totalPressed !== undefined
            ? `${totalPressed} of ${TOTAL_SECONDS} seconds already pressed`
            : `— of ${TOTAL_SECONDS} seconds already pressed`}
        </p>
      </div>
    </main>
  );
}
