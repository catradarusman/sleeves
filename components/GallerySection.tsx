"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import Link from "next/link";
import Composition from "@/components/Composition";
import Rack from "@/components/Rack";
import { useUnsealedToken } from "@/lib/useUnsealedToken";
import { usePressedSeconds } from "@/lib/usePressedSeconds";
import { TOTAL_SECONDS } from "@/constants";
import { getTokensOwnedBy } from "@/lib/sleeves";

const HIGHLIGHT_MINT_URL =
  "https://highlight.xyz/mint/base:0x4428be530724b5ee47e4cb0061f77024933a4dc3";

// viem nests the real cause; walk the chain rather than matching one message.
function isNetworkError(err: unknown): boolean {
  let cur = err;
  for (let i = 0; i < 6 && cur instanceof Error; i++) {
    const withDetails = cur as Error & { details?: string; shortMessage?: string };
    const text = `${cur.name} ${cur.message} ${withDetails.details ?? ""} ${withDetails.shortMessage ?? ""}`;
    if (/httprequesterror|timeouterror|socketclosed|http request failed|failed to fetch|fetch failed|econnrefused|timed out|network/i.test(text)) {
      return true;
    }
    cur = (cur as Error & { cause?: unknown }).cause;
  }
  return false;
}

export default function GallerySection({
  onPressCTA,
  sidebar,
}: {
  onPressCTA?: (tokenId: number) => void;
  // Rendered under the holder slot: the right column on desktop, below the
  // player on narrow screens.
  sidebar?: React.ReactNode;
}) {
  const { address } = useAccount();
  const unsealedTokenId = useUnsealedToken(address);

  const { data, status, error, refetch, isFetching } = usePressedSeconds();

  const pressedSeconds = data?.pressedSeconds ?? [];
  const totalPressed = data?.totalPressed ?? 0;
  const pressedSet = new Set(pressedSeconds.map((s) => s.tokenId));

  const { data: unpressedIds } = useQuery<number[]>({
    queryKey: ["holderUnpressed", address, totalPressed],
    queryFn: async () => {
      const owned = await getTokensOwnedBy(address!);
      return owned.filter((id) => !pressedSet.has(id));
    },
    enabled: !!address && status === "success",
  });

  useEffect(() => {
    if (unpressedIds && unpressedIds.length > 0) {
      import("../lib/audio").then((m) => m.preloadEncoder());
    }
  }, [unpressedIds]);

  // One slot for the holder's next action — never two at once.
  const yourSleeve = (() => {
    if (unsealedTokenId !== null) {
      return (
        <div className="border border-white/10 rounded-[20px] p-3">
          <p className="text-label text-white/90">second #{unsealedTokenId}</p>
          <p className="text-body text-white/60 mt-1 mb-3 text-pretty">
            your sound is made. it is not saved. one transaction left.
          </p>
          <Link
            href={`/press/${unsealedTokenId}`}
            className="block w-full py-2.5 text-body text-center text-black bg-white rounded-lg hover:bg-white/90 transition-[background-color,transform] active:scale-[0.96]"
          >
            finish saving your sound →
          </Link>
        </div>
      );
    }

    if (unpressedIds && unpressedIds.length > 0) {
      const tokenId = unpressedIds[0];
      return (
        <div className="border border-white/10 rounded-[20px] p-3">
          <p className="text-label text-white/90">second #{tokenId}</p>
          <p className="text-body text-white/60 mt-1 mb-3 text-pretty">
            {unpressedIds.length === 1
              ? "your second is still silent."
              : `you hold ${unpressedIds.length} seconds. none of them pressed.`}
          </p>
          {onPressCTA ? (
            <button
              onClick={() => onPressCTA(tokenId)}
              className="w-full py-2.5 text-body text-black bg-white rounded-lg hover:bg-white/90 transition-[background-color,transform] active:scale-[0.96]"
            >
              press second #{tokenId} →
            </button>
          ) : (
            <Link
              href={unpressedIds.length === 1 ? `/press/${tokenId}` : "/press"}
              className="block w-full py-2.5 text-body text-center text-black bg-white rounded-lg hover:bg-white/90 transition-[background-color,transform] active:scale-[0.96]"
            >
              press second #{tokenId} →
            </Link>
          )}
        </div>
      );
    }

    if (address && unpressedIds && unpressedIds.length === 0) {
      return (
        <div className="border border-white/10 rounded-[20px] p-3">
          <p className="text-body text-white/60 mb-3 text-pretty">
            every sleeve you hold is pressed.
          </p>
          <a
            href={HIGHLIGHT_MINT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 text-body text-center text-white/90 border border-white/40 rounded-lg hover:border-white/70 transition-colors"
          >
            get a sleeve on Highlight →
          </a>
        </div>
      );
    }

    if (!address) {
      return (
        <p className="text-body text-white/60 text-pretty">
          hold a sleeve? connect and press your second.{" "}
          <a
            href={HIGHLIGHT_MINT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/90 underline underline-offset-4 hover:text-white transition-colors rounded"
          >
            get a sleeve
          </a>
        </p>
      );
    }

    return null;
  })();

  if (status === "pending") {
    return (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:items-start">
        <div className="space-y-8 min-w-0">
          <p className="text-caption uppercase tracking-[0.28em] text-paper/60">reading Base…</p>
          <Composition pressedSeconds={[]} disabled />
        </div>
        <div>{sidebar}</div>
      </div>
    );
  }

  if (status === "error") {
    const unreachable = isNetworkError(error);

    return (
      <div className="border border-white/10 rounded-[20px] p-3">
        <p className="text-label text-white/90">
          {unreachable ? "base didn't answer" : "the read failed"}
        </p>
        <p className="text-body text-white/60 mt-1 mb-3 text-pretty">
          {unreachable
            ? "the composition lives onchain. nothing is shown until base responds."
            : "base answered. the contract didn't return the pressed seconds. nothing here is guessed."}
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="py-2.5 px-6 text-body text-white/90 border border-white/40 rounded-lg hover:border-white/70 transition-[border-color,transform] active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isFetching ? "trying…" : "try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:items-start">
      <div className="space-y-8 min-w-0">
        <p className="text-caption uppercase tracking-[0.28em] text-paper/60">
          {totalPressed === 0
            ? `${TOTAL_SECONDS} seconds · none pressed yet`
            : `${totalPressed} of ${TOTAL_SECONDS} seconds pressed`}
        </p>

        <Composition pressedSeconds={pressedSeconds} />

        <Rack pressedSeconds={pressedSeconds} />
      </div>

      <div className="space-y-8 lg:sticky lg:top-6">
        {yourSleeve}
        {sidebar}
      </div>
    </div>
  );
}
