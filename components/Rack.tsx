"use client";

import { useState } from "react";
import SleeveImage from "@/components/SleeveImage";
import { TOTAL_SECONDS } from "@/constants";
import type { PressedSecond } from "@/lib/sleeves";

type Props = { pressedSeconds: PressedSecond[] };

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function trackTime(second: number): string {
  const offset = second - 1;
  return `${Math.floor(offset / 60)}:${(offset % 60).toString().padStart(2, "0")}`;
}

function timeAgo(unixSeconds: number): string {
  if (unixSeconds <= 0) return "";
  const seconds = Math.floor(Date.now() / 1000) - unixSeconds;
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, name] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) return `${value} ${name}${value > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={copied ? "address copied" : `copy ${address}`}
      className="rounded text-caption text-paper/60 hover:text-paper transition-[color,transform] active:scale-[0.96]"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export default function Rack({ pressedSeconds }: Props) {
  const [showSilence, setShowSilence] = useState(false);

  const pressed = [...pressedSeconds]
    .filter((s) => s.second !== null)
    .sort((a, b) => (a.second ?? 0) - (b.second ?? 0));
  const pressedAt = new Set(pressed.map((s) => s.second));

  const silentSeconds = showSilence
    ? Array.from({ length: TOTAL_SECONDS }, (_, i) => i + 1).filter((s) => !pressedAt.has(s))
    : [];

  return (
    <section aria-label="the rack">
      <h2 className="flex items-baseline justify-between border-b border-paper/15 pb-3 text-caption uppercase tracking-[0.28em] text-paper/60">
        <span>the rack</span>
        <span>
          {pressed.length} pressed · {TOTAL_SECONDS - pressed.length} silent
        </span>
      </h2>

      {pressed.length === 0 ? (
        <p className="mt-4 text-body text-white/70">nobody has pressed a second yet.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {pressed.map((sleeve) => (
            <li key={sleeve.tokenId} className="rack-item">
              <span className="relative block">
                <SleeveImage src={sleeve.image} size={260} className="w-full brightness-[0.92] saturate-[0.9] transition-[filter,transform] duration-500 hover:brightness-100 hover:saturate-100" />
                <span className="absolute bottom-0 left-0 bg-paper px-2 py-1 text-caption tracking-[0.14em] text-[#111]">
                  {trackTime(sleeve.second!)}
                </span>
              </span>
              <p className="mt-2 text-body text-white/90">sleeve #{sleeve.second}</p>
              <p className="flex items-baseline justify-between gap-2 text-caption text-paper/60">
                <span className="truncate">
                  {sleeve.holderAddress ? (
                    <a
                      href={`https://basescan.org/address/${sleeve.holderAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded underline decoration-paper/25 underline-offset-4 hover:decoration-paper transition-colors"
                    >
                      {sleeve.ensName ?? shortAddress(sleeve.holderAddress)}
                    </a>
                  ) : (
                    "holder unavailable"
                  )}
                  {sleeve.pressedAt > 0 && ` · ${timeAgo(sleeve.pressedAt)}`}
                </span>
                {sleeve.holderAddress && <CopyAddress address={sleeve.holderAddress} />}
              </p>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => setShowSilence((v) => !v)}
        className="mt-6 rounded text-body text-paper/60 hover:text-paper transition-colors"
        aria-expanded={showSilence}
      >
        {showSilence ? "hide the silent seconds" : `show the ${TOTAL_SECONDS - pressed.length} silent seconds`}
      </button>

      {showSilence && (
        <ul className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-14" aria-label="unpressed seconds">
          {silentSeconds.map((second) => (
            <li
              key={second}
              title={`second ${second} · not pressed`}
              className="aspect-square rounded-[2px] text-caption text-paper/35 flex items-center justify-center tabular-nums"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(232,223,205,0.06) 0 5px, transparent 5px 10px)",
                boxShadow: "inset 0 0 0 1px rgba(232,223,205,0.10)",
              }}
            >
              {second}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
