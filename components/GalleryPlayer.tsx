"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { TOTAL_SECONDS } from "@/constants";
import type { PressedSecond } from "@/lib/sleeves";

export type { PressedSecond };

type GalleryPlayerProps = {
  pressedSeconds: PressedSecond[];
  totalPressed: number;
};

// Deterministic stub height per tokenId — gives visual texture to unpressed segments
function stubHeight(tokenId: number): number {
  const h = ((tokenId * 2654435761) >>> 0) % 15;
  return 18 + h; // 18–32px
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const SEGMENT_WIDTH = 4; // px per segment
const SEGMENT_GAP = 1;
const TRACK_HEIGHT = 48;

export default function GalleryPlayer({ pressedSeconds, totalPressed }: GalleryPlayerProps) {
  const pressedMap = new Map(pressedSeconds.map((s) => [s.tokenId, s]));

  const [playing, setPlaying] = useState(false);
  const [currentSecond, setCurrentSecond] = useState(0); // 0 = stopped, 1–273 = active
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const bufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const playStartTimeRef = useRef<number>(0); // AudioContext time when playback started
  const playOffsetRef = useRef<number>(0); // which second we started at (0-indexed offset)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  const cancelScheduled = useCallback(() => {
    scheduledNodesRef.current.forEach((n) => {
      try { n.stop(); } catch {}
    });
    scheduledNodesRef.current = [];
  }, []);

  const stopPlayback = useCallback(() => {
    cancelScheduled();
    if (tickRef.current) clearInterval(tickRef.current);
    setPlaying(false);
    setCurrentSecond(0);
  }, [cancelScheduled]);

  // Fetch and decode audio for a tokenId, cache it
  async function fetchBuffer(tokenId: number): Promise<AudioBuffer | null> {
    if (bufferCacheRef.current.has(tokenId)) {
      return bufferCacheRef.current.get(tokenId)!;
    }
    const second = pressedMap.get(tokenId);
    if (!second || !second.hasAudio) return null;

    try {
      const { getAudio } = await import("@/lib/sleeves");
      const bytes = await getAudio(tokenId);
      const ctx = getAudioCtx();
      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
      bufferCacheRef.current.set(tokenId, buffer);
      return buffer;
    } catch {
      return null;
    }
  }

  // Schedule LOOKAHEAD seconds of audio starting from startSecondIndex (0-based)
  const LOOKAHEAD = 10;
  async function scheduleLookahead(fromSecond: number, ctxStartTime: number) {
    const ctx = getAudioCtx();
    for (let i = 0; i < LOOKAHEAD; i++) {
      const secondIdx = fromSecond + i; // 0-based
      if (secondIdx >= TOTAL_SECONDS) break;
      const tokenId = secondIdx + 1;
      const offsetTime = ctxStartTime + i;
      const buffer = await fetchBuffer(tokenId);
      if (buffer) {
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(ctx.destination);
        node.start(offsetTime);
        scheduledNodesRef.current.push(node);
      }
    }
  }

  const startPlayback = useCallback(
    async (fromSecond: number) => {
      cancelScheduled();
      if (tickRef.current) clearInterval(tickRef.current);

      const ctx = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();

      const startAt = ctx.currentTime + 0.1;
      playStartTimeRef.current = startAt;
      playOffsetRef.current = fromSecond;

      setPlaying(true);
      setCurrentSecond(fromSecond + 1);

      await scheduleLookahead(fromSecond, startAt);

      tickRef.current = setInterval(() => {
        const elapsed = ctx.currentTime - playStartTimeRef.current;
        const sec = Math.floor(elapsed);
        const absoluteSecond = playOffsetRef.current + sec;

        if (absoluteSecond >= TOTAL_SECONDS) {
          stopPlayback();
          return;
        }

        setCurrentSecond(absoluteSecond + 1);

        // Schedule lookahead from current position
        const lookaheadFrom = absoluteSecond + 1;
        if (lookaheadFrom < TOTAL_SECONDS) {
          scheduleLookahead(lookaheadFrom, playStartTimeRef.current + sec + 1);
        }
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cancelScheduled, stopPlayback, pressedSeconds]
  );

  function handlePlayPause() {
    if (playing) {
      stopPlayback();
    } else {
      startPlayback(currentSecond > 0 ? currentSecond - 1 : 0);
    }
  }

  function handleSeek(tokenId: number) {
    const wasPlaying = playing;
    stopPlayback();
    setCurrentSecond(tokenId);
    if (wasPlaying) startPlayback(tokenId - 1);
  }

  function handleSegmentClick(tokenId: number) {
    setSelected(tokenId === selected ? null : tokenId);
    handleSeek(tokenId);
  }

  // Scroll active segment into view
  useEffect(() => {
    if (currentSecond > 0 && timelineRef.current) {
      const el = timelineRef.current.querySelector(
        `[data-token="${currentSecond}"]`
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentSecond]);

  useEffect(() => {
    return () => {
      stopPlayback();
      audioCtxRef.current?.close();
    };
  }, [stopPlayback]);

  const infoToken = selected ?? hovered;
  const infoSecond = infoToken ? pressedMap.get(infoToken) : null;

  const elapsedSeconds = currentSecond > 0 ? currentSecond - 1 : 0;

  return (
    <div className="w-full select-none">
      {/* Timeline */}
      <div
        ref={timelineRef}
        className="overflow-x-auto pb-2 cursor-pointer"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}
      >
        <div
          className="flex items-end gap-px"
          style={{ minWidth: TOTAL_SECONDS * (SEGMENT_WIDTH + SEGMENT_GAP), height: TRACK_HEIGHT + 8 }}
        >
          {Array.from({ length: TOTAL_SECONDS }, (_, i) => {
            const tokenId = i + 1;
            const second = pressedMap.get(tokenId);
            const isActive = currentSecond === tokenId;
            const isHov = hovered === tokenId;

            if (second) {
              return (
                <div
                  key={tokenId}
                  data-token={tokenId}
                  style={{ width: SEGMENT_WIDTH, height: TRACK_HEIGHT }}
                  className={[
                    "flex-shrink-0 rounded-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-white ring-1 ring-white ring-offset-1 ring-offset-[#111]"
                      : isHov
                      ? "bg-white/80"
                      : "bg-white/60",
                  ].join(" ")}
                  title={`second #${tokenId} — pressed by ${shortAddress(second.holderAddress)}`}
                  onMouseEnter={() => setHovered(tokenId)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleSegmentClick(tokenId)}
                />
              );
            }

            const h = stubHeight(tokenId);
            return (
              <div
                key={tokenId}
                data-token={tokenId}
                style={{ width: SEGMENT_WIDTH, height: h }}
                className={[
                  "flex-shrink-0 rounded-sm transition-colors cursor-pointer",
                  isHov ? "bg-white/30" : "bg-white/15",
                ].join(" ")}
                title={`second #${tokenId} — not yet pressed`}
                onMouseEnter={() => setHovered(tokenId)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSegmentClick(tokenId)}
              />
            );
          })}
        </div>
      </div>

      {/* Holder pins */}
      {pressedSeconds.length > 0 && (
        <div
          className="overflow-x-auto flex gap-3 pb-2 mt-1"
          style={{ scrollbarWidth: "none" }}
        >
          {pressedSeconds.map((s) => (
            <button
              key={s.tokenId}
              onClick={() => handleSeek(s.tokenId)}
              className="flex-shrink-0 flex flex-col items-center gap-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title={`Second #${s.tokenId} — ${s.ensName ?? s.holderAddress}`}
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                {(s.ensName ?? s.holderAddress).slice(2, 4).toUpperCase()}
              </div>
              <span className="text-[9px] text-white/50">{s.tokenId}</span>
            </button>
          ))}
        </div>
      )}

      {/* Transport */}
      <div className="flex items-center gap-4 mt-3">
        <button
          onClick={handlePlayPause}
          className="w-8 h-8 flex items-center justify-center border border-white/30 rounded hover:border-white/70 transition-colors text-sm"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "▐▐" : "▶"}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-1 bg-white/15 rounded cursor-pointer relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const targetSecond = Math.max(1, Math.min(TOTAL_SECONDS, Math.round(ratio * TOTAL_SECONDS)));
            handleSeek(targetSecond);
          }}
        >
          <div
            className="h-full bg-white/70 rounded transition-all"
            style={{ width: `${(elapsedSeconds / TOTAL_SECONDS) * 100}%` }}
          />
        </div>

        <span className="text-xs text-white/50 tabular-nums w-16 text-right">
          {formatTime(elapsedSeconds)} / 4:33
        </span>
      </div>

      {/* Info panel */}
      {infoToken && (
        <div className="mt-4 border border-white/10 rounded p-3 text-xs text-white/70">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-white font-medium">second #{infoToken}</div>
              {infoSecond ? (
                <>
                  <div>{infoSecond.ensName ?? shortAddress(infoSecond.holderAddress)}</div>
                  <div className="text-white/40">
                    {new Date(infoSecond.pressedAt * 1000).toLocaleDateString()}
                  </div>
                  <div className="text-white/40">
                    {infoSecond.hasAudio ? "audio sealed" : "audio pending"}
                  </div>
                  {infoSecond.hasAudio && (
                    <a
                      href={`farcaster://cast?text=${encodeURIComponent(`listen to second #${infoToken} of 273 sleeves — onchain audio by ${infoSecond.ensName ?? shortAddress(infoSecond.holderAddress)}`)}&embeds[]=${encodeURIComponent("https://sleeves.catra.fyi")}`}
                      className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                    >
                      share on farcaster →
                    </a>
                  )}
                </>
              ) : (
                <div className="text-white/30">not yet pressed</div>
              )}
            </div>
            {infoSecond?.hasAudio && (
              <button
                onClick={() => handleSeek(infoToken)}
                className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                aria-label="Play this second"
              >
                ▶
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
