"use client";

import { useAccount, useReadContracts } from "wagmi";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";

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
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <img src="/sleeve-art.gif" alt="273 Sleeves artwork" className="w-10 h-10 rounded object-cover opacity-80" />
          <div>
            <h1 className="text-display font-bold uppercase text-white/90">
              <Link href="/" className="hover:text-white/70 transition-colors">273 Sleeves: Sound</Link>
            </h1>
            <p className="text-caption text-white/40 mt-0.5">4′33″ onchain · Base</p>
          </div>
        </div>
        <ConnectButton />
      </div>

      {!address && (
        <p className="text-xs text-white/40">connect wallet to press your second.</p>
      )}

      {address && (loading || tokenIds === null) && (
        <p className="text-xs text-meta">loading...</p>
      )}

      {address && tokenIds !== null && (
        <div className="space-y-6">
          <p className="text-xs text-white/70">choose a second to press</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {tokenIds.map((id, i) => {
              const pressed = isPressedData?.[i]?.result === true;
              if (pressed) {
                return (
                  <div
                    key={id}
                    className="text-xs text-meta border border-white/10 px-3 py-2 text-center"
                  >
                    <span className="block">#{id}</span>
                    <span className="block text-[10px] mt-0.5">pressed</span>
                  </div>
                );
              }
              return (
                <Link
                  key={id}
                  href={`/press/${id}`}
                  className="text-xs text-white border border-white/40 px-3 py-2 text-center hover:border-white/70 transition-colors"
                >
                  <span className="block">#{id}</span>
                  <span className="block text-[10px] mt-0.5 text-white/40">press</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
