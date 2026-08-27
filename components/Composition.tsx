"use client";

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import SleeveImage from "@/components/SleeveImage";
import { TOTAL_SECONDS } from "@/constants";
import type { PressedSecond } from "@/lib/sleeves";

type CompositionProps = {
  pressedSeconds: PressedSecond[];
  disabled?: boolean;
};

/** Lets the rack drive the playhead without lifting position into a parent:
 *  position ticks once a second during playback, and re-rendering 273 grid
 *  cells at that rate is the one thing this surface cannot afford. */
export type CompositionHandle = { seek: (second: number) => void };

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function holderLabel(second: PressedSecond): string | null {
  if (second.ensName) return second.ensName;
  return second.holderAddress ? shortAddress(second.holderAddress) : null;
}

function initials(second: PressedSecond): string {
  if (second.ensName) return second.ensName.replace(".eth", "").slice(0, 2).toLowerCase();
  return second.holderAddress ? second.holderAddress.slice(2, 4).toLowerCase() : "";
}

// Deterministic bar height per second, so the waveform is stable across renders.
function barScale(second: number): number {
  const h = ((second * 2654435761) >>> 0) % 100;
  return 0.35 + (h / 100) * 0.65;
}

const LOOKAHEAD = 10;
const ACCENT = "#e8dfcd";

function Composition({ pressedSeconds, disabled = false }: CompositionProps, ref: React.Ref<CompositionHandle>) {
  // Keyed by the second a sleeve plays at, which is the sleeve's own number.
  // The ERC721 token id is only ever used to read that sleeve's audio.
  const pressedMap = new Map<number, PressedSecond>();
  for (const sleeve of pressedSeconds) {
    if (sleeve.second === null) continue;
    const existing = pressedMap.get(sleeve.second);
    if (existing) {
      // Two sleeves claiming one second would hide a real press. Keep the
      // first and say so, rather than overwriting it in silence.
      console.warn(
        `[sleeves] second ${sleeve.second} claimed by tokens ${existing.tokenId} and ${sleeve.tokenId}; keeping ${existing.tokenId}`
      );
      continue;
    }
    pressedMap.set(sleeve.second, sleeve);
  }

  const [playing, setPlaying] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [position, setPosition] = useState(1); // 1–273, the only playback position

  const audioCtxRef = useRef<AudioContext | null>(null);
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const scheduledSecondsRef = useRef<Set<number>>(new Set());
  const bufferCacheRef = useRef<Map<number, AudioBuffer>>(new Map());
  const playStartTimeRef = useRef<number>(0);
  const playOffsetRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    scheduledSecondsRef.current.clear();
  }, []);

  // Pauses: stops sound, keeps position. Nothing here resets to zero.
  const pausePlayback = useCallback(() => {
    cancelScheduled();
    if (tickRef.current) clearInterval(tickRef.current);
    setPlaying(false);
  }, [cancelScheduled]);

  // Audio bytes are read only when a second is played, then cached.
  const fetchBuffer = useCallback(async (second: number): Promise<AudioBuffer | null> => {
    if (bufferCacheRef.current.has(second)) {
      return bufferCacheRef.current.get(second)!;
    }
    const sleeve = pressedMap.get(second);
    if (!sleeve) return null;

    try {
      const { getAudio } = await import("@/lib/sleeves");
      const bytes = await getAudio(sleeve.tokenId);
      if (bytes.length === 0) return null;
      const ctx = getAudioCtx();
      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
      bufferCacheRef.current.set(second, buffer);
      return buffer;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressedSeconds]);

  const scheduleLookahead = useCallback(async (fromSecond: number, ctxStartTime: number) => {
    const ctx = getAudioCtx();
    for (let i = 0; i < LOOKAHEAD; i++) {
      const secondIdx = fromSecond + i; // 0-based
      if (secondIdx >= TOTAL_SECONDS) break;
      if (scheduledSecondsRef.current.has(secondIdx)) continue;
      const offsetTime = ctxStartTime + i;
      const buffer = await fetchBuffer(secondIdx + 1);
      if (buffer) {
        // Only a second that actually produced audio counts as scheduled, so a
        // failed read is retried on the next pass instead of playing silence
        // for the rest of the session.
        scheduledSecondsRef.current.add(secondIdx);
        const node = ctx.createBufferSource();
        node.buffer = buffer;
        node.connect(ctx.destination);
        node.start(offsetTime);
        scheduledNodesRef.current.push(node);
      } else if (!pressedMap.has(secondIdx + 1)) {
        // Genuine silence: nothing to fetch, so it never needs revisiting.
        scheduledSecondsRef.current.add(secondIdx);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBuffer]);

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
      setPosition(fromSecond + 1);

      await scheduleLookahead(fromSecond, startAt);

      tickRef.current = setInterval(() => {
        const elapsed = ctx.currentTime - playStartTimeRef.current;
        const sec = Math.floor(elapsed);
        const absoluteSecond = playOffsetRef.current + sec;

        if (absoluteSecond >= TOTAL_SECONDS) {
          pausePlayback();
          setPosition(TOTAL_SECONDS);
          return;
        }

        setPosition(absoluteSecond + 1);

        const lookaheadFrom = absoluteSecond + 1;
        if (lookaheadFrom < TOTAL_SECONDS) {
          scheduleLookahead(lookaheadFrom, playStartTimeRef.current + sec + 1);
        }
      }, 500);
    },
    [cancelScheduled, pausePlayback, scheduleLookahead]
  );

  function handlePlayPause() {
    if (playing) {
      pausePlayback();
    } else {
      startPlayback(position - 1);
    }
  }

  function handleSeek(second: number) {
    setPosition(second);
    if (playing) startPlayback(second - 1);
  }

  useImperativeHandle(ref, () => ({
    seek: (second: number) => {
      setPosition(second);
      if (playing) startPlayback(second - 1);
    },
  }), [playing, startPlayback]);

  useEffect(() => {
    return () => {
      cancelScheduled();
      if (tickRef.current) clearInterval(tickRef.current);
      audioCtxRef.current?.close();
    };
  }, [cancelScheduled]);

  // Decoration: one bar per second, mirrored around the centre line. Seconds
  // already played carry the accent; unpressed seconds stay a flat silence line.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      setTrackWidth(width);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const step = width / TOTAL_SECONDS;
      const barWidth = Math.max(step - 0.6, 0.6);
      const mid = height / 2;

      for (let i = 0; i < TOTAL_SECONDS; i++) {
        const second = i + 1;
        const pressed = pressedMap.has(second);
        const played = second <= position;
        const half = pressed ? (height / 2) * barScale(second) : 1;
        ctx.fillStyle = played
          ? pressed ? ACCENT : "rgba(232,223,205,0.42)"
          : pressed ? "rgba(232,223,205,0.30)" : "rgba(232,223,205,0.13)";
        ctx.fillRect(i * step, mid - half, barWidth, half * 2);
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressedSeconds, position]);

  // Holder markers, thinned against the real track width so two never overlap:
  // one marker is 24px wide, so it needs 28px of room whatever the screen is.
  const minGapPercent = trackWidth > 0 ? (28 / trackWidth) * 100 : 6;
  const placeable = [...pressedSeconds]
    .filter((s) => s.holderAddress && s.second !== null)
    .sort((a, b) => (a.second ?? 0) - (b.second ?? 0));
  const markers: PressedSecond[] = [];
  let lastPercent = -100;
  for (const second of placeable) {
    const percent = (((second.second ?? 1) - 1) / (TOTAL_SECONDS - 1)) * 100;
    if (percent - lastPercent >= minGapPercent) {
      markers.push(second);
      lastPercent = percent;
    }
  }
  // The thinning above drops whatever will not fit. At 273 pressed that is most
  // of them, so say so rather than presenting a sample as the whole.
  const hiddenMarkers = placeable.length - markers.length;

  const current = pressedMap.get(position) ?? null;
  const elapsedSeconds = position - 1;
  const currentHolder = current ? holderLabel(current) : null;
  const valueText = current
    ? currentHolder
      ? `second ${position} of ${TOTAL_SECONDS}, pressed by ${currentHolder}`
      : `second ${position} of ${TOTAL_SECONDS}, pressed, holder unknown`
    : `second ${position} of ${TOTAL_SECONDS}, not pressed`;

  return (
    <section aria-label="the composition so far" className="space-y-5">
      {/* The sleeve on display: whatever second the playhead sits on. */}
      <div className="flex items-end gap-5">
        <SleeveImage
          src={current?.image ?? null}
          size={220}
          emptyLabel="silence"
          priority
          className="w-24 sm:w-32 lg:w-[168px] flex-shrink-0 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]"
        />
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-caption uppercase tracking-[0.28em] text-paper/60">
            {current ? "now showing" : "silence"}
          </p>
          <p className="mt-2 font-medium leading-[0.85] tracking-[-0.04em] text-paper text-[56px] sm:text-[72px] lg:text-[88px]">
            {String(position).padStart(3, "0")}
          </p>
          {current ? (
            currentHolder && current.holderAddress ? (
              <p className="mt-3 text-body text-white/70 text-pretty">
                sleeve #{current.second} · pressed by{" "}
                <a
                  href={`https://basescan.org/address/${current.holderAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper transition-colors"
                >
                  {currentHolder}
                </a>
              </p>
            ) : (
              <p className="mt-3 text-body text-white/70">
                sleeve #{current.second} · pressed. base didn&apos;t return who pressed it.
              </p>
            )
          ) : (
            <p className="mt-3 text-body text-white/70">not pressed. still silence.</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handlePlayPause}
          disabled={disabled}
          className="w-14 h-14 lg:w-16 lg:h-16 flex-shrink-0 flex items-center justify-center rounded-full border border-paper text-paper transition-[background-color,color,transform] hover:bg-paper hover:text-[#111] active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={playing ? "pause" : "play the composition"}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
              <rect x="3" y="2" width="4" height="14" rx="1" />
              <rect x="11" y="2" width="4" height="14" rx="1" />
            </svg>
          ) : (
            /* Nudged right by 1px: a triangle centred geometrically reads left. */
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true" className="translate-x-px">
              <path d="M4 2.5v13l12-6.5z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="relative h-[72px] lg:h-28">
            <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 w-full h-full" />
            <input
              type="range"
              min={1}
              max={TOTAL_SECONDS}
              step={1}
              value={position}
              disabled={disabled}
              onChange={(e) => handleSeek(Number(e.target.value))}
              aria-label="seek through 4′33″"
              aria-valuetext={valueText}
              className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-40
                [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0.5 [&::-webkit-slider-thumb]:h-full [&::-webkit-slider-thumb]:bg-white
                [&::-moz-range-track]:h-full [&::-moz-range-track]:bg-transparent
                [&::-moz-range-thumb]:w-0.5 [&::-moz-range-thumb]:h-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-none"
            />
          </div>

          <div className="relative h-6 mt-1" aria-hidden="true">
            {markers.map((second) => (
              <span
                key={second.tokenId}
                title={`sleeve #${second.second} · ${holderLabel(second)}`}
                className="absolute top-0 w-6 h-6 -ml-3 rounded-full border border-paper/25 bg-[#191919] text-paper/75 flex items-center justify-center text-caption"
                style={{ left: `${(((second.second ?? 1) - 1) / (TOTAL_SECONDS - 1)) * 100}%` }}
              >
                {initials(second)}
              </span>
            ))}
          </div>

          <div className="flex items-baseline justify-between gap-2 text-caption text-paper/60 tracking-[0.12em] mt-1">
            <span className="flex-shrink-0">{formatTime(elapsedSeconds)}</span>
            {hiddenMarkers > 0 && (
              <span className="min-w-0 truncate tracking-normal text-paper/45">
                showing {markers.length} of {placeable.length} presses
              </span>
            )}
            <span className="flex-shrink-0">4:33</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default forwardRef(Composition);
