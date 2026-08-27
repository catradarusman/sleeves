import { getClient } from "./sleeves";
import { SLEEVES_CONTRACT_ADDRESS } from "./contracts";
import type { SleeveMeta } from "./sleeveIndex";

const TOKEN_URI_ABI = [
  {
    type: "function",
    name: "tokenURI",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

// Tokens minted after the last index build would otherwise be dropped from the
// timeline and the rack while the header still counts them. Fetch their
// metadata live instead, and cache it for the session.
const runtimeCache = new Map<number, SleeveMeta | null>();

export async function fetchSleeveMeta(tokenIds: number[]): Promise<Map<number, SleeveMeta>> {
  const found = new Map<number, SleeveMeta>();
  const missing = tokenIds.filter((id) => !runtimeCache.has(id));

  for (const id of tokenIds) {
    const cached = runtimeCache.get(id);
    if (cached) found.set(id, cached);
  }
  if (missing.length === 0) return found;

  const client = getClient();
  const uris = await client.multicall({
    contracts: missing.map((id) => ({
      address: SLEEVES_CONTRACT_ADDRESS,
      abi: TOKEN_URI_ABI,
      functionName: "tokenURI" as const,
      args: [BigInt(id)] as const,
    })),
  });

  await Promise.all(
    missing.map(async (id, i) => {
      const uri = uris[i].status === "success" ? (uris[i].result as string) : null;
      if (!uri) {
        runtimeCache.set(id, null);
        return;
      }
      try {
        const meta = await fetch(uri).then((r) => r.json());
        const second = Number(
          meta.attributes?.find((a: { trait_type?: string }) => a.trait_type === "Second")?.value
        );
        if (!Number.isFinite(second)) {
          runtimeCache.set(id, null);
          return;
        }
        const entry: SleeveMeta = { second, image: meta.image, name: meta.name };
        runtimeCache.set(id, entry);
        found.set(id, entry);
      } catch {
        runtimeCache.set(id, null);
      }
    })
  );

  return found;
}
