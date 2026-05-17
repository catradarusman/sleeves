"use client";

import { useEffect, useRef } from "react";

type Props = {
  audioBuffer: AudioBuffer | null;
  width?: number;
  height?: number;
  animate?: boolean;
};

export default function Waveform({ audioBuffer, width = 300, height = 48, animate = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    if (!audioBuffer) {
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    const data = audioBuffer.getChannelData(0);
    const barCount = width;
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

    if (!animate) {
      ctx.fillStyle = "#ccc";
      for (let i = 0; i < barCount; i++) {
        const barH = Math.max(1, peaks[i] * height);
        ctx.fillRect(i, midY - barH / 2, 1, barH);
      }
      return;
    }

    const duration = 600;
    const start = performance.now();
    let rafId: number;

    function frame(now: number) {
      const elapsed = now - start;
      const revealed = Math.min(barCount, Math.floor((elapsed / duration) * barCount));
      ctx!.fillStyle = "#111";
      ctx!.fillRect(0, 0, width, height);
      ctx!.fillStyle = "#ccc";
      for (let i = 0; i < revealed; i++) {
        const barH = Math.max(1, peaks[i] * height);
        ctx!.fillRect(i, midY - barH / 2, 1, barH);
      }
      if (revealed < barCount) {
        rafId = requestAnimationFrame(frame);
      }
    }

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [audioBuffer, width, height, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", background: "#111" }}
    />
  );
}
