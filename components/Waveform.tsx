"use client";

import { useEffect, useRef } from "react";

type Props = {
  audioBuffer: AudioBuffer | null;
  width?: number;
  height?: number;
};

export default function Waveform({ audioBuffer, width = 300, height = 48 }: Props) {
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
      // Flat grey stub: centered horizontal line
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

    ctx.fillStyle = "#ccc";

    for (let i = 0; i < barCount; i++) {
      let peak = 0;
      const start = i * samplesPerBar;
      for (let j = start; j < start + samplesPerBar; j++) {
        const abs = Math.abs(data[j]);
        if (abs > peak) peak = abs;
      }
      const barH = Math.max(1, peak * height);
      ctx.fillRect(i, midY - barH / 2, 1, barH);
    }
  }, [audioBuffer, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", background: "#111" }}
    />
  );
}
