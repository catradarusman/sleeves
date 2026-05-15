"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPublicClient, decodeEventLog, http, toHex } from "viem";
import { base, baseSepolia } from "viem/chains";
import { SLEEVES_SOUND_ABI, SOUND_CONTRACT_ADDRESS } from "@/lib/contracts";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
import { deriveSeed } from "@/lib/seed";
import { generateAudio } from "@/lib/audio";

const publicClient = createPublicClient({
  chain: Number(process.env.NEXT_PUBLIC_CHAIN_ID) === 84532 ? baseSepolia : base,
  transport: http(
    Number(process.env.NEXT_PUBLIC_CHAIN_ID) === 84532
      ? "https://sepolia.base.org"
      : "https://mainnet.base.org"
  ),
});

type Step = "idle" | "tx1" | "generating" | "tx2" | "done" | "error";

export default function PressFlow({ tokenId }: { tokenId: number }) {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  const { data: isPressedData, isLoading } = useReadContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "isPressed",
    args: [BigInt(tokenId)],
    chainId: CHAIN_ID,
  });

  // These only execute when the token is already pressed
  const { data: pressedByData } = useReadContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "pressedBy",
    args: [BigInt(tokenId)],
    chainId: CHAIN_ID,
    query: { enabled: isPressedData === true },
  });

  const { data: audioHex } = useReadContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "getAudio",
    args: [BigInt(tokenId)],
    chainId: CHAIN_ID,
    query: { enabled: isPressedData === true },
  });

  // Once pressedBy + audioHex are loaded, decide: recovery mode or redirect
  useEffect(() => {
    if (!isPressedData) return;
    if (pressedByData === undefined || audioHex === undefined) return;

    const isRecovery =
      address &&
      (pressedByData as string).toLowerCase() === address.toLowerCase() &&
      (audioHex as string).length <= 2;

    if (!isRecovery) {
      router.replace(`/pressed/${tokenId}`);
    }
  }, [isPressedData, pressedByData, audioHex, address, tokenId, router]);

  // True when: pressed by this wallet, audio not yet sealed
  const recoveryMode =
    isPressedData === true &&
    pressedByData !== undefined &&
    audioHex !== undefined &&
    !!address &&
    (pressedByData as string).toLowerCase() === address.toLowerCase() &&
    (audioHex as string).length <= 2;

  async function handlePress() {
    if (!address) return;
    setError(null);

    try {
      // Step 1: mintSound
      setStep("tx1");
      const hash1 = await writeContractAsync({
        address: SOUND_CONTRACT_ADDRESS,
        abi: SLEEVES_SOUND_ABI,
        functionName: "mintSound",
        args: [BigInt(tokenId)],
      });

      const receipt1 = await publicClient.waitForTransactionReceipt({ hash: hash1 });

      // Extract pressedAt from SecondPressed event log — never read from contract state
      let pressedAt: bigint | undefined;
      for (const log of receipt1.logs) {
        try {
          const decoded = decodeEventLog({
            abi: SLEEVES_SOUND_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "SecondPressed") {
            pressedAt = (decoded.args as { timestamp: bigint }).timestamp;
            break;
          }
        } catch {
          // not a matching log
        }
      }

      if (pressedAt === undefined) {
        throw new Error("SecondPressed event not found in receipt");
      }

      await runAudioAndSeal(pressedAt);
    } catch (err) {
      setStep("error");
      setError(toUserError(err));
    }
  }

  // Resume from step 2: re-derive seed from on-chain pressedAt, regenerate, seal
  async function handleResume() {
    if (!address) return;
    setError(null);

    try {
      setStep("generating");
      const pressedAt = await publicClient.readContract({
        address: SOUND_CONTRACT_ADDRESS,
        abi: SLEEVES_SOUND_ABI,
        functionName: "getPressedAt",
        args: [BigInt(tokenId)],
      });

      await runAudioAndSeal(pressedAt as bigint);
    } catch (err) {
      setStep("error");
      setError(toUserError(err));
    }
  }

  async function runAudioAndSeal(pressedAt: bigint) {
    if (!address) return;

    setStep("generating");
    const seed = deriveSeed(BigInt(tokenId), address as `0x${string}`, pressedAt);
    const audioBytes = await generateAudio(seed); // throws if > 15000 bytes

    setStep("tx2");
    const hash2 = await writeContractAsync({
      address: SOUND_CONTRACT_ADDRESS,
      abi: SLEEVES_SOUND_ABI,
      functionName: "setAudio",
      args: [BigInt(tokenId), toHex(audioBytes)],
    });

    // Trust the receipt — do not call getAudio() to verify
    await publicClient.waitForTransactionReceipt({ hash: hash2 });
    setStep("done");
    await new Promise((r) => setTimeout(r, 600));
    router.push(`/pressed/${tokenId}`);
  }

  function toUserError(err: unknown): string {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("audio too large")) {
      return "audio generation failed — please try again.";
    }
    return msg;
  }

  if (!address) {
    return (
      <p className="text-xs text-white/40">connect wallet to press your second.</p>
    );
  }

  // Still loading isPressed, or waiting for pressedBy + audioHex to resolve
  const stillLoading =
    isLoading || (isPressedData === true && (pressedByData === undefined || audioHex === undefined));

  if (stillLoading) {
    return <p className="text-xs text-white/30">loading...</p>;
  }

  return (
    <div className="space-y-6 max-w-sm">
      {/* Recovery mode: pressed but audio not sealed */}
      {recoveryMode && step === "idle" && (
        <>
          <p className="text-xs text-white/90">second #{tokenId}</p>
          <p className="text-xs text-white/60 leading-relaxed">
            your second is locked but the audio isn&apos;t sealed. finish it.
          </p>
          <button
            onClick={handleResume}
            className="text-xs border border-white/30 px-4 py-2 hover:border-white/60 transition-colors"
          >
            seal the audio
          </button>
        </>
      )}

      {/* Normal press UI */}
      {!recoveryMode && step === "idle" && (
        <>
          {!confirmed && (
            <>
              <div>
                <p className="text-xs text-white/90">second #{tokenId}</p>
                <p className="text-xs text-white/50 mt-4 leading-relaxed">
                  second #{tokenId} of 273 is yours. press it and a sound is born — derived from this moment, this block, this wallet. you&apos;ll never hear it before it exists. that&apos;s the point.
                </p>
              </div>
              <button
                onClick={() => setConfirmed(true)}
                className="text-xs border border-white/60 px-6 py-2 min-w-[120px] hover:border-white transition-[border-color] duration-200"
              >
                press it →
              </button>
            </>
          )}

          {confirmed && (
            <div className="space-y-4 max-w-sm">
              <p className="text-xs text-white/70 leading-relaxed">
                this is permanent. your sound will be sealed onchain. you cannot preview it or undo this.
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                  className="w-3 h-3 cursor-pointer appearance-none border border-white/40 checked:bg-white transition-colors"
                />
                <span className="text-xs text-white/60">i understand, press my second</span>
              </label>

              <div className="flex items-center gap-4">
                <button
                  onClick={handlePress}
                  disabled={!checkboxChecked}
                  className="text-xs border border-white/30 px-6 py-2 min-w-[120px] hover:border-white/60 transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  confirm and press
                </button>
                <button
                  onClick={() => { setConfirmed(false); setCheckboxChecked(false); }}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors"
                >
                  go back
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step indicators (shared by both normal and resume flows) */}
      {(step === "tx1" || step === "generating" || step === "tx2" || step === "done") && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-1.5">
            <p className="text-xs text-white/60 font-mono">
              {step === "tx1" && `locking second #${tokenId}...`}
              {step === "generating" && "synthesizing your sound..."}
              {step === "tx2" && "sealing it onchain..."}
              {step === "done" && "done."}
            </p>
            {step !== "done" && (
              <span
                className="text-xs text-white/60 font-mono"
                style={{ animation: "blink 1s step-end infinite" }}
              >
                _
              </span>
            )}
          </div>
          {(step === "tx1" || step === "tx2") && (
            <p className="text-xs text-white/30 tabular-nums">
              {step === "tx1" ? "1 of 2" : "2 of 2"}
            </p>
          )}
        </div>
      )}

      {step === "error" && (
        <div className="space-y-3">
          <p className="text-xs text-red-400/80 break-words">{error}</p>
          <button
            onClick={() => {
              setStep("idle");
              setError(null);
            }}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            try again
          </button>
        </div>
      )}
    </div>
  );
}
