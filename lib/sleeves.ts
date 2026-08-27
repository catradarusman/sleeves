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
  const defaultRpc = chainId === 84532
    ? "https://sepolia.base.org"
    : "https://mainnet.base.org";
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? defaultRpc;
  // Bounded so a dead RPC surfaces an error in seconds, not after a minute
  // of silent retries behind a loading state.
  return createPublicClient({
    chain,
    transport: http(rpc, { timeout: 6_000, retryCount: 1 }),
  });
}

function getMainnetClient() {
  const rpc = process.env.NEXT_PUBLIC_ETH_RPC_URL ?? "https://eth.llamarpc.com";
  // ENS is a nicety: fail fast and fall back to the raw address.
  return createPublicClient({
    chain: mainnet,
    transport: http(rpc, { timeout: 5_000, retryCount: 0 }),
  });
}

async function resolveEnsNames(addresses: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(addresses)];
  const client = getMainnetClient();
  const results = await Promise.allSettled(
    unique.map((addr) => client.getEnsName({ address: addr as `0x${string}` }))
  );
  const map = new Map<string, string | null>();
  unique.forEach((addr, i) => {
    const r = results[i];
    map.set(addr, r.status === "fulfilled" ? (r.value ?? null) : null);
  });
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
    ensName: row.holderAddress ? ensMap.get(row.holderAddress) ?? null : null,
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
