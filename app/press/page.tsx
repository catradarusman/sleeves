"use client";

import { useAccount, useReadContracts } from "wagmi";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ConnectButton from "@/components/ConnectButton";
import SleeveImage from "@/components/SleeveImage";
import { sleeveMeta } from "@/lib/sleeveIndex";

import { getTokensOwnedBy } from "@/lib/sleeves";
import { SLEEVES_SOUND_ABI, SOUND_CONTRACT_ADDRESS } from "@/lib/contracts";

export default function PressPicker() {
  const router = useRouter();
  const { address } = useAccount();
  const [tokenIds, setTokenIds] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getTokensOwnedBy(address)
      .then((ids) => {
        if (ids.length === 0) {
          router.replace("/no-sleeve");
        } else if (ids.length === 1) {
          router.replace(`/press/${ids[0]}`);
        } else {
          setTokenIds(ids);
        }
      })
      .finally(() => setLoading(false));
  }, [address, router]);

  const { data: isPressedData } = useReadContracts({
    contracts: (tokenIds ?? []).map((id) => ({
      address: SOUND_CONTRACT_ADDRESS,
      abi: SLEEVES_SOUND_ABI,
      functionName: "isPressed" as const,
      args: [BigInt(id)] as const,
      chainId: CHAIN_ID,
    })),
    query: { enabled: (tokenIds ?? []).length > 0 },
  });

  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 lg:px-8 max-w-lg lg:max-w-4xl mx-auto">
      <SiteHeader />

      {!address && (
        <div className="max-w-xs space-y-3">
          <p className="text-body text-white/60 text-pretty">
            connect your wallet to press your second.
          </p>
          <ConnectButton variant="primary" />
        </div>
      )}

      {address && (loading || tokenIds === null) && (
        <p className="text-body text-white/60">reading Base…</p>
      )}

      {address && tokenIds !== null && (
        <div className="space-y-6">
          <p className="text-body text-white/60">choose a second to press</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {tokenIds.map((id, i) => {
              const pressed = isPressedData?.[i]?.result === true;
              if (pressed) {
                return (
                  <div key={id} className="opacity-50">
                    <SleeveImage src={sleeveMeta(id)?.image ?? null} size={320} sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 45vw" className="w-full" />
                    <p className="mt-2 text-body text-white/60">
                      sleeve #{sleeveMeta(id)?.second ?? id}
                    </p>
                    <p className="text-caption text-paper/60">pressed</p>
                  </div>
                );
              }
              return (
                <Link
                  key={id}
                  href={`/press/${id}`}
                  className="group block rounded-[2px] transition-transform active:scale-[0.98]"
                >
                  <SleeveImage
                    src={sleeveMeta(id)?.image ?? null}
                    size={320}
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 45vw"
                    className="w-full brightness-[0.92] transition-[filter] duration-500 group-hover:brightness-110"
                  />
                  <p className="mt-2 text-body text-white/90">
                    sleeve #{sleeveMeta(id)?.second ?? id}
                  </p>
                  <p className="text-caption text-paper/60">press this second →</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
