"use client";

import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 40;

type Props = {
  audioBuffer: AudioBuffer | null;
  /** Fixed CSS width. Omit to fill the parent and follow it on resize — the
   *  parent must have a definite width, or measuring a 100%-wide canvas
   *  against it feeds back on itself. */
  width?: number;
  height?: number;
  animate?: boolean;
  visibleBars?: number;
};

export default function Waveform({ audioBuffer, width, height = 48, animate = false, visibleBars }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [measured, setMeasured] = useState(width ?? 300);
  const fluid = width === undefined;

  // A fixed pixel width left the canvas smaller than its column on desktop.
  useEffect(() => {
    if (!fluid) return;
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setMeasured(next);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, [fluid]);

  const w = fluid ? measured : width;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // The backing store follows the device, not CSS: at 1x the bars were soft
    // on every retina screen.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, height);

    if (!audioBuffer) {
      ctx.strokeStyle = "rgba(232,223,205,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(w, height / 2);
      ctx.stroke();
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const barCount = BAR_COUNT;
    const barW = w / barCount;
    const gap = Math.min(2, barW * 0.18);
    const samplesPerBar = Math.floor(data.length / barCount);
    const midY = height / 2;

    const peaks: number[] = [];
    for (let i = 0; i < barCount; i++) {
      let peak = 0;
      const start = i * samplesPerBar;
      for (let j = start; j < start + samplesPerBar; j++) {
        const abs = Math.abs(data[j]);
        if (abs > peak) peak = abs;
      }
      peaks.push(peak);
    }

    function drawBars(count: number) {
      ctx!.fillStyle = "#111";
      ctx!.fillRect(0, 0, w, height);
      ctx!.fillStyle = "#e8dfcd";
      for (let i = 0; i < count; i++) {
        const barH = Math.max(2, peaks[i] * height);
        ctx!.fillRect(i * barW, midY - barH / 2, barW - gap, barH);
      }
    }

    if (visibleBars !== undefined) {
      drawBars(visibleBars);
      return;
    }

    if (!animate) {
      drawBars(barCount);
      return;
    }

    const duration = 600;
    const start = performance.now();
    let rafId: number;

    function frame(now: number) {
      const elapsed = now - start;
      const revealed = Math.min(barCount, Math.floor((elapsed / duration) * barCount));
      drawBars(revealed);
      if (revealed < barCount) {
        rafId = requestAnimationFrame(frame);
      }
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [audioBuffer, w, height, animate, visibleBars]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        background: "#111",
        width: fluid ? "100%" : `${w}px`,
        height: `${height}px`,
      }}
    />
  );
}
