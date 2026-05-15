import { keccak256, encodePacked } from "viem";

export function deriveSeed(
  tokenId: bigint,
  holderAddress: `0x${string}`,
  soundMintTimestamp: bigint
): `0x${string}` {
  return keccak256(
    encodePacked(
      ["uint256", "address", "uint256"],
      [tokenId, holderAddress, soundMintTimestamp]
    )
  );
}

const OSC_TYPES = ["sine", "triangle", "sawtooth", "square"] as const;
export type OscType = (typeof OSC_TYPES)[number];

export type SynthParams = {
  oscType: OscType;
  frequency: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  reverbWet: number;
  noiseFloor: number;
};

function readUint32BE(hex: string, byteOffset: number): number {
  return (parseInt(hex.slice(byteOffset * 2, byteOffset * 2 + 8), 16) >>> 0);
}

function mapRange(value: number, min: number, max: number): number {
  return min + (value / 0xffffffff) * (max - min);
}

export function extractParams(seed: `0x${string}`): SynthParams {
  const hex = seed.slice(2); // 64 hex chars = 32 bytes
  return {
    oscType:    OSC_TYPES[readUint32BE(hex, 0) % 4],
    frequency:  mapRange(readUint32BE(hex, 4),  80,    1200),
    attack:     mapRange(readUint32BE(hex, 8),  0.001, 0.1),
    decay:      mapRange(readUint32BE(hex, 12), 0.05,  0.4),
    sustain:    mapRange(readUint32BE(hex, 16), 0.1,   0.8),
    release:    mapRange(readUint32BE(hex, 20), 0.05,  0.5),
    reverbWet:  mapRange(readUint32BE(hex, 24), 0.0,   0.6),
    noiseFloor: mapRange(readUint32BE(hex, 28), 0.0,   0.03),
  };
}
