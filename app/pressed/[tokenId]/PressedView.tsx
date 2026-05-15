"use client";

import { useAccount, useReadContract } from "wagmi";
import { useRef, useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import Waveform from "@/components/Waveform";
import { SLEEVES_SOUND_ABI, SOUND_CONTRACT_ADDRESS } from "@/lib/contracts";
import { decodeOgg } from "@/lib/audio";
import { TOTAL_SECONDS } from "@/constants";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);

const publicClient = createPublicClient({
  chain: Number(process.env.NEXT_PUBLIC_CHAIN_ID) === 84532 ? baseSepolia : base,
  transport: http(
    Number(process.env.NEXT_PUBLIC_CHAIN_ID) === 84532
      ? "https://sepolia.base.org"
      : "https://mainnet.base.org"
  ),
});

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

function formatTokenTime(tokenId: number): string {
  const secs = tokenId - 1;
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
  const [waveformVisible, setWaveformVisible] = useState(false);
  const [copyVisible, setCopyVisible] = useState(false);
  const [sublineVisible, setSublineVisible] = useState(false);
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
    requestAnimationFrame(() => {
      setWaveformVisible(true);
      setTimeout(() => {
        setCopyVisible(true);
        setTimeout(() => setSublineVisible(true), 400);
      }, 800);
    });
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
    return <p className="text-xs text-white/30">loading...</p>;
  }

  const hasAudio = audioHex !== null && audioHex.length > 2;
  const isOwn =
    address && pressedBy
      ? address.toLowerCase() === (pressedBy as string).toLowerCase()
      : false;

  // Screen D: you pressed it
  if (isOwn) {
    const shareText = encodeURIComponent(`i pressed second #${tokenId} of 273 sleeves`);
    const shareEmbed = encodeURIComponent("https://sleeves.catra.fyi");
    const shareHref = `farcaster://cast?text=${shareText}&embeds[]=${shareEmbed}`;

    return (
      <div className="space-y-6 max-w-sm">
        {hasAudio && (
          <div className="space-y-3">
            <div
              style={{
                maxWidth: waveformVisible ? 320 : 0,
                overflow: "hidden",
                transition: "max-width 800ms linear",
              }}
            >
              <Waveform audioBuffer={audioBuffer} width={320} height={48} />
            </div>
            <p
              className="text-xs text-white transition-opacity duration-500"
              style={{ opacity: copyVisible ? 1 : 0 }}
            >
              second #{tokenId} is sealed.
            </p>
            <p
              className="text-xs text-white/40 transition-opacity duration-500"
              style={{ opacity: sublineVisible ? 1 : 0 }}
            >
              it will play at {formatTokenTime(tokenId)} in the 4′33″.
            </p>
            <button
              onClick={togglePlay}
              disabled={!audioBuffer}
              className="text-xs border border-white/30 px-3 py-1.5 hover:border-white/60 transition-colors disabled:opacity-30"
            >
              {playing ? "stop" : "play"}
            </button>
          </div>
        )}

        {!hasAudio && (
          <p className="text-xs text-white/30">
            {audioPollExhausted
              ? "audio is being sealed onchain — refresh in a moment."
              : "loading audio..."}
          </p>
        )}

        <div className="text-xs text-white/40 space-y-1">
          <p>
            pressed by you
            {pressedAtData ? ` · ${formatDate(pressedAtData as bigint)}` : ""}
          </p>
          {totalPressedData !== undefined && (
            <p>{Number(totalPressedData)} of {TOTAL_SECONDS} pressed</p>
          )}
        </div>

        <a
          href={shareHref}
          className="block text-xs text-white/50 hover:text-white transition-colors"
        >
          share on farcaster →
        </a>
      </div>
    );
  }

  // Screen E: someone else pressed it
  return (
    <div className="space-y-6 max-w-sm">
      <div>
        <p className="text-xs text-white">second #{tokenId}</p>
        <p className="text-xs text-white/50 mt-1">
          pressed by {shortAddress(pressedBy as string)}
        </p>
      </div>

      {hasAudio && (
        <div className="space-y-3">
          <Waveform audioBuffer={audioBuffer} width={320} height={48} />
          <button
            onClick={togglePlay}
            disabled={!audioBuffer}
            className="text-xs border border-white/30 px-3 py-1.5 hover:border-white/60 transition-colors disabled:opacity-30"
          >
            {playing ? "stop" : "play"}
          </button>
        </div>
      )}

      {!hasAudio && (
        <p className="text-xs text-white/30">
          {audioPollExhausted
            ? "audio is being sealed onchain — refresh in a moment."
            : "loading audio..."}
        </p>
      )}

      <p className="text-xs text-white/40">
        pressed on {pressedAtData ? formatDate(pressedAtData as bigint) : "—"}
      </p>

      <a
        href="/"
        className="text-xs text-white/40 hover:text-white transition-colors"
      >
        view the full composition →
      </a>
    </div>
  );
}
