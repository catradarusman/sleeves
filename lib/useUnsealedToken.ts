import { useState, useEffect } from "react";
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

export function useUnsealedToken(address: string | undefined): number | null {
  const [unsealedTokenId, setUnsealedTokenId] = useState<number | null>(null);

  useEffect(() => {
    if (!address) {
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
  }, [address]);

  return unsealedTokenId;
}
