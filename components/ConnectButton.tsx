"use client";

import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getTokensOwnedBy } from "@/lib/sleeves";
import { SLEEVES_SOUND_ABI, SOUND_CONTRACT_ADDRESS } from "@/lib/contracts";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);

const publicClient = createPublicClient({
  chain: CHAIN_ID === 84532 ? baseSepolia : base,
  transport: http(
    CHAIN_ID === 84532 ? "https://sepolia.base.org" : "https://mainnet.base.org"
  ),
});

export default function ConnectButton() {
  const { address, status, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const prevStatus = useRef<string>();
  const [unsealedTokenId, setUnsealedTokenId] = useState<number | null>(null);

  // Auto-route on connect, but only from the home page
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (prev !== "connected" && status === "connected" && address && pathname === "/") {
      getTokensOwnedBy(address).then((ids) => {
        if (ids.length === 0) router.push("/no-sleeve");
        else if (ids.length === 1) router.push(`/press/${ids[0]}`);
        else router.push("/press");
      });
    }
  }, [status, address, router, pathname]);

  // Check for unsealed seconds whenever the wallet is connected
  useEffect(() => {
    if (!address || !isConnected) {
      setUnsealedTokenId(null);
      return;
    }
    let cancelled = false;

    getTokensOwnedBy(address).then(async (ids) => {
      if (cancelled || ids.length === 0) return;
      const results = await Promise.all(
        ids.map(async (id) => {
          const [isPressed, audioHex] = await Promise.all([
            publicClient.readContract({
              address: SOUND_CONTRACT_ADDRESS,
              abi: SLEEVES_SOUND_ABI,
              functionName: "isPressed",
              args: [BigInt(id)],
            }),
            publicClient.readContract({
              address: SOUND_CONTRACT_ADDRESS,
              abi: SLEEVES_SOUND_ABI,
              functionName: "getAudio",
              args: [BigInt(id)],
            }),
          ]);
          return { id, isPressed, audioHex };
        })
      );
      if (cancelled) return;
      const unsealed = results.find(
        (r) => r.isPressed === true && (r.audioHex as string).length <= 2
      );
      if (unsealed) setUnsealedTokenId(unsealed.id);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [address, isConnected]);

  return (
    <div className="flex items-center gap-3">
      {isConnected && (
        unsealedTokenId !== null ? (
          <Link
            href={`/press/${unsealedTokenId}`}
            className="text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
          >
            finish sealing second #{unsealedTokenId} →
          </Link>
        ) : (
          <Link
            href="/press"
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            press your second →
          </Link>
        )
      )}
      <ConnectKitButton />
    </div>
  );
}
