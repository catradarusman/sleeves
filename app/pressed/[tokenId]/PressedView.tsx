"use client";

import { useAccount, useReadContract } from "wagmi";
import { useRef, useState, useEffect } from "react";
import Waveform from "@/components/Waveform";
import ShareSleeve from "@/components/ShareSleeve";
import { SLEEVES_SOUND_ABI, SOUND_CONTRACT_ADDRESS } from "@/lib/contracts";
import { getClient } from "@/lib/sleeves";
import { decodeOgg } from "@/lib/audio";
import SleeveImage from "@/components/SleeveImage";
import { sleeveMeta } from "@/lib/sleeveIndex";
import { TOTAL_SECONDS } from "@/constants";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);

const publicClient = getClient();

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Takes the sleeve's own second, not the token id: the two differ.
function formatTokenTime(second: number): string {
  const secs = second - 1;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PressedView({ tokenId }: { tokenId: number }) {
  const { address } = useAccount();

  const { data: pressedBy } = useReadContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "pressedBy",
    args: [BigInt(tokenId)],
    chainId: CHAIN_ID,
  });

  const { data: pressedAtData } = useReadContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "pressedAt",
    args: [BigInt(tokenId)],
    chainId: CHAIN_ID,
  });

  const { data: totalPressedData } = useReadContract({
    address: SOUND_CONTRACT_ADDRESS,
    abi: SLEEVES_SOUND_ABI,
    functionName: "totalPressed",
    chainId: CHAIN_ID,
  });

  // Poll getAudio: try every 2s, up to 5 attempts
  const [audioHex, setAudioHex] = useState<string | null>(null);
  const [audioPollExhausted, setAudioPollExhausted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (cancelled) return;
        try {
          const result = await publicClient!.readContract({
            address: SOUND_CONTRACT_ADDRESS,
            abi: SLEEVES_SOUND_ABI,
            functionName: "getAudio",
            args: [BigInt(tokenId)],
          });
          if (!cancelled && (result as string).length > 2) {
            setAudioHex(result as string);
            return;
          }
        } catch {
          // continue polling
        }
      }
      if (!cancelled) setAudioPollExhausted(true);
    }

    poll();
    return () => { cancelled = true; };
  }, [tokenId]);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [visibleBars, setVisibleBars] = useState(0);
  const [copyVisible, setCopyVisible] = useState(false);
  const [sublineVisible, setSublineVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!audioHex || audioHex.length <= 2) return;
    const bytes = new Uint8Array(Buffer.from(audioHex.slice(2), "hex"));
    decodeOgg(bytes).then((buffer) => {
      setAudioBuffer(buffer);
    }).catch(() => {});
  }, [audioHex]);

  useEffect(() => {
    if (!audioBuffer) return;

    const duration = 600;
    const startTime = performance.now();
    let rafId: number;

    function step(now: number) {
      const elapsed = now - startTime;
      const revealed = Math.min(40, Math.floor((elapsed / duration) * 40));
      setVisibleBars(revealed);
      if (revealed < 40) {
        rafId = requestAnimationFrame(step);
      }
    }

    rafId = requestAnimationFrame(step);

    const t1 = setTimeout(() => {
      setCopyVisible(true);
      setTimeout(() => {
        setSublineVisible(true);
        setTimeout(() => setShareVisible(true), 600);
      }, 400);
    }, 800);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
    };
  }, [audioBuffer]);

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch {}
      audioCtxRef.current?.close();
    };
  }, []);

  function togglePlay() {
    if (playing) {
      try { sourceRef.current?.stop(); } catch {}
      setPlaying(false);
      return;
    }
    if (!audioBuffer) return;
    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    src.onended = () => setPlaying(false);
    src.start();
    sourceRef.current = src;
    setPlaying(true);
  }

  if (!pressedBy) {
    return <p className="text-body text-white/60">reading Base…</p>;
  }

  const hasAudio = audioHex !== null && audioHex.length > 2;
  const isOwn =
    address && pressedBy
      ? address.toLowerCase() === (pressedBy as string).toLowerCase()
      : false;

  // Screen D: you pressed it
  if (isOwn) {
    return (
      <div className="space-y-8 max-w-md lg:max-w-4xl">
        {hasAudio && (
          <div className="grid gap-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-start sm:gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
            <SleeveImage
              src={sleeveMeta(tokenId)?.image ?? null}
              size={680}
              sizes="(min-width: 1024px) 340px, (min-width: 640px) 220px, 70vw"
              priority
              className="w-3/5 sm:w-full shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]"
            />
            <div className="min-w-0 space-y-4">
              <div
                className="transition-opacity duration-300"
                style={{ opacity: visibleBars > 0 ? 1 : 0 }}
              >
                <Waveform audioBuffer={audioBuffer} height={56} visibleBars={visibleBars} />
              </div>
              <p
                className="text-label text-white text-balance transition-opacity duration-500"
                style={{ opacity: copyVisible ? 1 : 0 }}
              >
                sleeve #{sleeveMeta(tokenId)?.second ?? tokenId} is saved onchain.
              </p>
              <p
                className="text-body text-white/60 transition-opacity duration-500"
                style={{ opacity: sublineVisible ? 1 : 0 }}
              >
                it plays at {formatTokenTime(sleeveMeta(tokenId)?.second ?? tokenId)} in the 4′33″.
              </p>
              <button
                onClick={togglePlay}
                disabled={!audioBuffer}
                className="inline-flex min-h-[40px] min-w-[88px] items-center justify-center rounded-md border border-white/40 px-4 text-body hover:border-white/70 transition-[border-color,transform] active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {playing ? "stop" : "play"}
              </button>
            </div>
          </div>
        )}

        {!hasAudio && (
          <p className="text-body text-white/60">
            {audioPollExhausted
              ? "your sound is still being saved onchain. refresh in a moment."
              : "loading your sound…"}
          </p>
        )}

        <div className="text-body text-white/60 space-y-1">
          <p>
            pressed by you
            {pressedAtData ? ` · ${formatDate(pressedAtData as bigint)}` : ""}
          </p>
          {totalPressedData !== undefined && (
            <p className="tabular-nums">{Number(totalPressedData)} of {TOTAL_SECONDS} pressed</p>
          )}
        </div>

        <div
          className="transition-opacity duration-500"
          style={{ opacity: shareVisible ? 1 : 0, pointerEvents: shareVisible ? "auto" : "none" }}
        >
          <ShareSleeve tokenId={tokenId} mine />
        </div>
      </div>
    );
  }

  // Screen E: someone else pressed it
  return (
    <div className="max-w-md lg:max-w-4xl">
      <div className="grid gap-6 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:items-start sm:gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-12">
        <SleeveImage
          src={sleeveMeta(tokenId)?.image ?? null}
          size={680}
          sizes="(min-width: 1024px) 340px, (min-width: 640px) 220px, 70vw"
          priority
          className="w-3/5 sm:w-full shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]"
        />

        <div className="min-w-0 space-y-6">
          <div>
            <p className="text-caption uppercase tracking-[0.28em] text-paper/60">now showing</p>
            <p className="mt-1 text-[44px] lg:text-[64px] font-medium leading-[0.85] tracking-[-0.04em] tabular-nums text-paper">
              {String(sleeveMeta(tokenId)?.second ?? tokenId).padStart(3, "0")}
            </p>
            <p className="mt-3 text-body text-white/60">
              pressed by {shortAddress(pressedBy as string)}
            </p>
          </div>

          {hasAudio && (
            <div className="space-y-4">
              <Waveform audioBuffer={audioBuffer} height={56} />
              <button
                onClick={togglePlay}
                disabled={!audioBuffer}
                className="inline-flex min-h-[40px] min-w-[88px] items-center justify-center rounded-md border border-white/40 px-4 text-body hover:border-white/70 transition-[border-color,transform] active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {playing ? "stop" : "play"}
              </button>
            </div>
          )}

          {!hasAudio && (
            <p className="text-body text-white/60 text-pretty">
              {audioPollExhausted
                ? "the sound is still being saved onchain. refresh in a moment."
                : "loading the sound…"}
            </p>
          )}

          <p className="text-body text-white/60">
            pressed on {pressedAtData ? formatDate(pressedAtData as bigint) : "—"}
          </p>

          <ShareSleeve tokenId={tokenId} />

          <a
            href="/"
            className="inline-flex min-h-[40px] items-center rounded text-body text-white/60 hover:text-white/90 transition-colors"
          >
            view the full composition →
          </a>
        </div>
      </div>
    </div>
  );
}
