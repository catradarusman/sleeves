import { createPublicClient, http } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";
import { sleeveMeta } from "./sleeveIndex";
import {
  SLEEVES_SOUND_ABI,
  ERC721_ABI,
  SOUND_CONTRACT_ADDRESS,
  SLEEVES_CONTRACT_ADDRESS,
} from "./contracts";

export type PressedSecond = {
  tokenId: number;
  /** Position in the 4′33″, from the sleeve's "Second" trait. Null when the
   *  token is not in the sleeve index yet (minted after the last index build). */
  second: number | null;
  image: string | null;
  // null when the chain confirmed the press but the holder read did not come
  // back (public RPCs rate-limit). Never a placeholder address.
  holderAddress: string | null;
  ensName: string | null;
  pressedAt: number;
};

export function getClient() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
  const chain = chainId === 84532 ? baseSepolia : base;
  const rpc =
    chainId === 84532
      ? process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? "https://sepolia.base.org"
      : process.env.NEXT_PUBLIC_RPC_URL ?? "https://mainnet.base.org";
  // Bounded so a dead RPC surfaces an error in seconds, not after a minute
  // of silent retries behind a loading state.
  return createPublicClient({
    chain,
    transport: http(rpc, { timeout: 6_000, retryCount: 1 }),
  });
}

// One client for the whole session. A fresh client per call would reset the
// batch scheduler, which is the thing doing the work here.
let mainnetClient: ReturnType<typeof createPublicClient> | null = null;

function getMainnetClient() {
  if (mainnetClient) return mainnetClient;
  // Must send CORS headers: this runs in the browser. llamarpc does not, which
  // silently killed every ENS lookup and left holders showing as raw hex.
  const rpc = process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://ethereum-rpc.publicnode.com";
  mainnetClient = createPublicClient({
    chain: mainnet,
    // A reverse lookup is one eth_call against the ENS Universal Resolver. Sent
    // one per holder, 273 holders is 273 requests a minute at a free public
    // node, which rate-limits and leaves every holder rendering as raw hex.
    // multicall folds them into a few aggregate3 calls instead.
    batch: { multicall: { batchSize: 8_192 } },
    // A batch covers many lookups, so it needs longer than a single call did.
    transport: http(rpc, { timeout: 10_000, retryCount: 0, batch: true }),
  });
  return mainnetClient;
}

// Names change rarely; presses do not. Without this the 60s refetch resolves
// every holder again from scratch, forever.
const ensCache = new Map<string, string | null>();

async function resolveEnsNames(addresses: string[]): Promise<Map<string, string | null>> {
  // Keyed lowercase: the contract returns checksummed addresses, and the same
  // holder must not occupy two cache slots.
  const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const missing = unique.filter((addr) => !ensCache.has(addr));

  if (missing.length > 0) {
    const client = getMainnetClient();
    const results = await Promise.allSettled(
      missing.map((addr) => client.getEnsName({ address: addr as `0x${string}` }))
    );
    missing.forEach((addr, i) => {
      const r = results[i];
      // Only a settled answer is cached. A failed lookup stays unknown so the
      // next read retries it, rather than pinning that holder to raw hex for
      // the rest of the session.
      if (r.status === "fulfilled") ensCache.set(addr, r.value ?? null);
    });
  }

  const map = new Map<string, string | null>();
  for (const addr of unique) map.set(addr, ensCache.get(addr) ?? null);
  return map;
}

// Splits contracts into parallel chunks to stay within RPC multicall limits.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function multicallChunked(client: ReturnType<typeof getClient>, contracts: any[], chunkSize = 100): Promise<any[]> {
  const chunks: unknown[][] = [];
  for (let i = 0; i < contracts.length; i += chunkSize) {
    chunks.push(contracts.slice(i, i + chunkSize));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await Promise.all(chunks.map((c) => client.multicall({ contracts: c as any })));
  return results.flat();
}

export async function getTotalPressed(): Promise<number> {
  const client = getClient();
  const result = await client.readContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "totalPressed",
  });
  return Number(result);
}

export async function isPressed(tokenId: number): Promise<boolean> {
  const client = getClient();
  return client.readContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "isPressed",
    args: [BigInt(tokenId)],
  });
}

export async function getPressedBy(tokenId: number): Promise<string> {
  const client = getClient();
  return client.readContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "pressedBy",
    args: [BigInt(tokenId)],
  });
}

export async function getPressedAt(tokenId: number): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "pressedAt",
    args: [BigInt(tokenId)],
  });
}

export async function getAudio(tokenId: number): Promise<Uint8Array> {
  const client = getClient();
  const result = await client.readContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "getAudio",
    args: [BigInt(tokenId)],
  });
  return new Uint8Array(Buffer.from(result.slice(2), "hex"));
}

// Returns the number of Sleeves NFTs minted so far (grows over time, max 273).
async function getSleevesMinted(client: ReturnType<typeof getClient>): Promise<number> {
  const result = await client.readContract({
    address: SLEEVES_CONTRACT_ADDRESS,
    abi: ERC721_ABI,
    functionName: "totalSupply",
  });
  return Number(result);
}

// Reads all pressed seconds. Scopes multicall to minted tokens only — avoids
// oversized batches against the public RPC that would fail for all 273.
// Never reads getAudio: the payload is up to 15 KB per second and is only
// needed when a second is actually played.
export async function getAllPressedSeconds(): Promise<PressedSecond[]> {
  const client = getClient();
  const minted = await getSleevesMinted(client);
  const tokenIds = Array.from({ length: minted }, (_, i) => i + 1);

  const isPressedResults = await multicallChunked(client, tokenIds.map((id) => ({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "isPressed" as const,
    args: [BigInt(id)] as const,
  })));

  const pressedIds = tokenIds.filter((_, i) => isPressedResults[i].result === true);
  if (pressedIds.length === 0) return [];

  const [byResults, atResults] = await Promise.all([
    multicallChunked(client, pressedIds.map((id) => ({
      address: SOUND_CONTRACT_ADDRESS,
      abi: SLEEVES_SOUND_ABI,
      functionName: "pressedBy" as const,
      args: [BigInt(id)] as const,
    }))),
    multicallChunked(client, pressedIds.map((id) => ({
      address: SOUND_CONTRACT_ADDRESS,
      abi: SLEEVES_SOUND_ABI,
      functionName: "pressedAt" as const,
      args: [BigInt(id)] as const,
    }))),
  ]);

  // isPressed is the fact that a second was pressed. The holder is a separate
  // fact: when that read fails, the second stays listed with holder null.
  const rows = pressedIds.map((tokenId, i) => {
    const holder = byResults[i].result as string | undefined;
    const known =
      typeof holder === "string" &&
      holder !== "0x0000000000000000000000000000000000000000";
    const meta = sleeveMeta(tokenId);
    return {
      tokenId,
      second: meta?.second ?? null,
      image: meta?.image ?? null,
      holderAddress: known ? holder : null,
      pressedAt: Number(atResults[i].result ?? BigInt(0)),
    };
  });

  const ensMap = await resolveEnsNames(
    rows.map((row) => row.holderAddress).filter((a): a is string => a !== null)
  );

  return rows.map((row) => ({
    ...row,
    ensName: row.holderAddress ? ensMap.get(row.holderAddress.toLowerCase()) ?? null : null,
  }));
}

// Returns token IDs owned by an address in the Sleeves collection.
// Scoped to minted tokens only to keep the multicall batch within RPC limits.
export async function getTokensOwnedBy(address: string): Promise<number[]> {
  const client = getClient();

  const balance = await client.readContract({
    address: SLEEVES_CONTRACT_ADDRESS,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: [address as `0x${string}`],
  });
  if (Number(balance) === 0) return [];

  const minted = await getSleevesMinted(client);
  const tokenIds = Array.from({ length: minted }, (_, i) => i + 1);

  const ownerResults = await multicallChunked(client, tokenIds.map((id) => ({
    address: SLEEVES_CONTRACT_ADDRESS,
    abi: ERC721_ABI,
    functionName: "ownerOf" as const,
    args: [BigInt(id)] as const,
  })));

  return tokenIds.filter(
    (_, i) => (ownerResults[i].result as string | undefined)?.toLowerCase() === address.toLowerCase()
  );
}
