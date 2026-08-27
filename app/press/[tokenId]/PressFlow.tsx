"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConnectButton from "@/components/ConnectButton";
import { decodeEventLog, toHex } from "viem";
import { SLEEVES_SOUND_ABI, SOUND_CONTRACT_ADDRESS } from "@/lib/contracts";
import { getClient } from "@/lib/sleeves";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);
import SleeveImage from "@/components/SleeveImage";
import { sleeveMeta } from "@/lib/sleeveIndex";
import { deriveSeed } from "@/lib/seed";
import { generateAudio } from "@/lib/audio";
import ShareSleeve from "@/components/ShareSleeve";

const publicClient = getClient();

type Step = "idle" | "tx1" | "generating" | "tx2" | "done" | "error";

export default function PressFlow({ tokenId, onComplete }: { tokenId: number; onComplete?: () => void }) {
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
      if (onComplete) {
        onComplete();
      } else {
        router.replace(`/pressed/${tokenId}`);
      }
    }
  }, [isPressedData, pressedByData, audioHex, address, tokenId, router, onComplete]);

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
    await new Promise((r) => setTimeout(r, onComplete ? 1500 : 600));
    if (onComplete) {
      onComplete();
    } else {
      router.push(`/pressed/${tokenId}`);
    }
  }

  // Maps wallet and RPC failures to sentences. Never prints a raw viem message.
  function toUserError(err: unknown): string {
    const msg = err instanceof Error ? err.message : "";
    const name = err instanceof Error ? err.name : "";

    if (msg.startsWith("audio too large")) {
      return "making the sound failed. try again.";
    }
    if (name === "UserRejectedRequestError" || /user rejected|user denied|rejected the request/i.test(msg)) {
      return "you cancelled it. nothing was sent.";
    }
    if (/insufficient funds/i.test(msg)) {
      return "not enough ETH on base to pay for gas.";
    }
    if (/chain mismatch|does not match the target chain|switch chain|chain not configured/i.test(msg)) {
      return "your wallet is on the wrong network. switch to base and try again.";
    }
    if (name === "HttpRequestError" || /fetch failed|failed to fetch|timed out|network error/i.test(msg)) {
      return "base didn't answer. check your connection and try again.";
    }
    if (/execution reverted|reverted/i.test(msg)) {
      return "the contract refused this press. this second may already be pressed.";
    }
    return "the transaction didn't go through. try again.";
  }

  if (!address) {
    return (
      <div className="max-w-xs space-y-3">
        <p className="text-body text-white/60 text-pretty">
          connect your wallet to press your second.
        </p>
        <ConnectButton variant="primary" />
      </div>
    );
  }

  // Still loading isPressed, or waiting for pressedBy + audioHex to resolve
  const stillLoading =
    isLoading || (isPressedData === true && (pressedByData === undefined || audioHex === undefined));

  if (stillLoading) {
    return <p className="text-body text-white/60">reading Base…</p>;
  }

  const meta = sleeveMeta(tokenId);
  const sleeveNumber = meta ? `#${meta.second}` : `token #${tokenId}`;

  return (
    <div className="space-y-6 max-w-sm">
      {/* Your sleeve, before you press it. The art is the reason to care. */}
      {step === "idle" && (
        <div className="flex items-end gap-4">
          <SleeveImage src={meta?.image ?? null} size={200} priority className="w-28 flex-shrink-0" />
          <div className="pb-1">
            <p className="text-caption uppercase tracking-[0.28em] text-paper/60">your sleeve</p>
            <p className="mt-1 text-[44px] font-medium leading-[0.85] tracking-[-0.04em] text-paper">
              {String(meta?.second ?? tokenId).padStart(3, "0")}
            </p>
            {meta && (
              <p className="mt-2 text-caption text-paper/60">
                plays at {Math.floor((meta.second - 1) / 60)}:{String((meta.second - 1) % 60).padStart(2, "0")} of 4′33″
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recovery mode: pressed but audio not sealed */}
      {recoveryMode && step === "idle" && (
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1">
            <p className="text-label text-white/90">sleeve {sleeveNumber} is reserved. the sound isn&apos;t saved.</p>
            <p className="text-body text-white/60 text-pretty">
              your first transaction went through. the second one, which saves the sound onchain, did not. one transaction left.
            </p>
          </div>
          <button
            onClick={handleResume}
            className="text-body border border-white/40 rounded px-6 py-2 min-w-[120px] hover:border-white/70 transition-[border-color,transform] duration-200 active:scale-[0.96]"
          >
            save the sound →
          </button>
        </div>
      )}

      {/* Normal press UI */}
      {!recoveryMode && step === "idle" && (
        <>
          {!confirmed && (
            <>
              <div>
                <p className="text-label text-white/90">sleeve {sleeveNumber}</p>
                <p className="text-body text-white/60 mt-4 text-pretty">
                  sleeve {sleeveNumber} of 273 is yours. press it and a sound exists, derived from this block, this wallet, this moment. you hear it after it exists, never before. that is the point.
                </p>
              </div>
              <button
                onClick={() => setConfirmed(true)}
                className="text-body rounded border border-paper px-6 py-2 min-w-[120px] text-paper transition-[background-color,color,transform] duration-200 hover:bg-paper hover:text-[#111] active:scale-[0.96]"
              >
                press it →
              </button>
              <p className="text-caption text-white/60 mt-2">
                2 signatures. the first reserves your second. the second saves the sound onchain.
              </p>
            </>
          )}

          {confirmed && (
            <div className="space-y-4 max-w-sm">
              <p className="text-body text-white/60 text-pretty">
                permanent. saved onchain. no preview. no undo.
              </p>

              <label className="flex items-center gap-3 cursor-pointer p-3 -mx-3 rounded hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={checkboxChecked}
                  onChange={(e) => setCheckboxChecked(e.target.checked)}
                  className="w-4 h-4 cursor-pointer appearance-none border border-white/40 checked:bg-white transition-colors flex-shrink-0"
                />
                <span className="text-body text-white/60">i understand, press my second</span>
              </label>

              <div className="flex items-center gap-4">
                <button
                  onClick={handlePress}
                  disabled={!checkboxChecked}
                  className="text-body border border-white/40 rounded px-6 py-2 min-w-[120px] hover:border-white/70 transition-[border-color,opacity,transform] duration-200 active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  confirm and press
                </button>
                <button
                  onClick={() => { setConfirmed(false); setCheckboxChecked(false); }}
                  className="text-body text-white/60 rounded hover:text-white/90 transition-colors"
                >
                  go back
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Step indicators (shared by both normal and resume flows) */}
      {(step === "tx1" || step === "generating" || step === "tx2" || step === "done") && (() => {
        const STEPS = ["reserve", "make sound", "save onchain"] as const;
        const currentIdx = step === "tx1" ? 0 : step === "generating" ? 1 : step === "tx2" ? 2 : 3;
        return (
          <div className="flex gap-6 justify-center mb-6">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full border ${
                  i < currentIdx ? "bg-white border-white" :
                  i === currentIdx ? "border-white animate-pulse" :
                  "border-meta"
                }`} />
                <span className="text-caption text-white/60">{label}</span>
              </div>
            ))}
          </div>
        );
      })()}
      {(step === "tx1" || step === "generating" || step === "tx2" || step === "done") && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-1.5">
            <p className="text-caption text-white/60 font-mono">
              {step === "tx1" && `reserving sleeve ${sleeveNumber}…`}
              {step === "generating" && "making your sound…"}
              {step === "tx2" && "saving it onchain…"}
              {step === "done" && `sleeve ${sleeveNumber} is saved onchain.`}
            </p>
            {step !== "done" && (
              <span
                className="text-caption text-white/60 font-mono"
                style={{ animation: "blink 1s step-end infinite" }}
              >
                _
              </span>
            )}
          </div>
          {(step === "tx1" || step === "tx2") && (
            <p className="text-caption text-white/60 tabular-nums">
              {step === "tx1" ? "1 of 2" : "2 of 2"}
            </p>
          )}
          {step === "done" && onComplete && (
            <ShareSleeve tokenId={tokenId} mine className="pt-3" />
          )}
        </div>
      )}

      {step === "error" && (
        <div className="space-y-3">
          <p className="text-body text-red-400 break-words">{error}</p>
          <button
            onClick={() => {
              setStep("idle");
              setError(null);
            }}
            className="text-body text-white/60 rounded hover:text-white/90 transition-colors"
          >
            try again
          </button>
        </div>
      )}
    </div>
  );
}
