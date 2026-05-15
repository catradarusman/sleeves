import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { TOTAL_SECONDS } from "@/constants";
import {
  SLEEVES_SOUND_ABI,
  ERC721_ABI,
  SOUND_CONTRACT_ADDRESS,
  SLEEVES_CONTRACT_ADDRESS,
} from "./contracts";

export type PressedSecond = {
  tokenId: number;
  holderAddress: string;
  ensName: string | null;
  pressedAt: number;
  hasAudio: boolean;
};

function getClient() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
  const chain = chainId === 84532 ? baseSepolia : base;
  const rpc = chainId === 84532
    ? "https://sepolia.base.org"
    : "https://mainnet.base.org";
  return createPublicClient({ chain, transport: http(rpc) });
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

// Reads all pressed seconds in a single multicall sweep (1–273).
// Returns only tokens where isPressed == true.
export async function getAllPressedSeconds(): Promise<PressedSecond[]> {
  const client = getClient();

  const tokenIds = Array.from({ length: TOTAL_SECONDS }, (_, i) => i + 1);

  // Batch: isPressed for all 273
  const isPressedResults = await client.multicall({
    contracts: tokenIds.map((id) => ({
      address: SOUND_CONTRACT_ADDRESS,
      abi: SLEEVES_SOUND_ABI,
      functionName: "isPressed" as const,
      args: [BigInt(id)] as const,
    })),
  });

  const pressedIds = tokenIds.filter((_, i) => isPressedResults[i].result === true);

  if (pressedIds.length === 0) return [];

  // Batch: pressedBy + pressedAt for pressed tokens only
  const [byResults, atResults] = await Promise.all([
    client.multicall({
      contracts: pressedIds.map((id) => ({
        address: SOUND_CONTRACT_ADDRESS,
        abi: SLEEVES_SOUND_ABI,
        functionName: "pressedBy" as const,
        args: [BigInt(id)] as const,
      })),
    }),
    client.multicall({
      contracts: pressedIds.map((id) => ({
        address: SOUND_CONTRACT_ADDRESS,
        abi: SLEEVES_SOUND_ABI,
        functionName: "pressedAt" as const,
        args: [BigInt(id)] as const,
      })),
    }),
  ]);

  // hasAudio: check via getAudio length — use tokenURI attributes as proxy;
  // simplest: call getAudio and check bytes length > 0 via multicall
  const audioResults = await client.multicall({
    contracts: pressedIds.map((id) => ({
      address: SOUND_CONTRACT_ADDRESS,
      abi: SLEEVES_SOUND_ABI,
      functionName: "getAudio" as const,
      args: [BigInt(id)] as const,
    })),
  });

  return pressedIds.map((tokenId, i) => ({
    tokenId,
    holderAddress: (byResults[i].result as string) ?? "0x0000000000000000000000000000000000000000",
    ensName: null, // ENS resolution done client-side via wagmi useEnsName
    pressedAt: Number(atResults[i].result ?? BigInt(0)),
    hasAudio: ((audioResults[i].result as `0x${string}`) ?? "0x").length > 2,
  }));
}

// Returns token IDs owned by an address in the Sleeves collection.
// Multicalls ownerOf for all 273 IDs — avoids getLogs block range limits.
export async function getTokensOwnedBy(address: string): Promise<number[]> {
  const client = getClient();
  const tokenIds = Array.from({ length: TOTAL_SECONDS }, (_, i) => i + 1);

  const ownerResults = await client.multicall({
    contracts: tokenIds.map((id) => ({
      address: SLEEVES_CONTRACT_ADDRESS,
      abi: ERC721_ABI,
      functionName: "ownerOf" as const,
      args: [BigInt(id)] as const,
    })),
  });

  return tokenIds.filter(
    (_, i) => ownerResults[i].result?.toLowerCase() === address.toLowerCase()
  );
}
