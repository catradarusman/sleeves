"use client";

import { useState } from "react";
import Link from "next/link";
import SleeveImage from "@/components/SleeveImage";
import ShareSleeve from "@/components/ShareSleeve";
import { TOTAL_SECONDS } from "@/constants";
import type { PressedSecond } from "@/lib/sleeves";

type Props = {
  pressedSeconds: PressedSecond[];
  /** Drives the playhead to a second when a sleeve is chosen. */
  onSelect?: (second: number) => void;
  /** The connected wallet, when there is one. Enables the "yours" filter. */
  viewerAddress?: string;
};

// 4 columns on desktop, 2 on mobile: both divide evenly, so no page ends ragged.
// At 273 pressed this is 12 pages instead of 14,000px of scroll.
const PAGE_SIZE = 24;

/** Matches a sleeve number, an ENS name, or an address. Numbers match by
 *  prefix so the list narrows while typing; text matches anywhere. */
function matches(sleeve: PressedSecond, needle: string): boolean {
  const digits = needle.replace(/^#/, "");
  if (/^\d+$/.test(digits)) return String(sleeve.second).startsWith(digits);
  if (sleeve.ensName?.toLowerCase().includes(needle)) return true;
  return sleeve.holderAddress?.toLowerCase().includes(needle) ?? false;
}

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

export default function Rack({ pressedSeconds, onSelect, viewerAddress }: Props) {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [minesOnly, setMinesOnly] = useState(false);

  const pressed = [...pressedSeconds]
    .filter((s) => s.second !== null)
    .sort((a, b) => (a.second ?? 0) - (b.second ?? 0));

  // Pasted addresses arrive with stray whitespace and mixed case often enough
  // to be worth normalising before anything is compared.
  const needle = query.trim().toLowerCase();
  const mine = viewerAddress?.toLowerCase();
  // Derived, not synced: the toggle unmounts when the wallet disconnects, so a
  // stored-only flag would leave the filter stuck on with no control to clear it.
  const minesActive = minesOnly && !!mine;
  const results = pressed.filter(
    (s) =>
      (!minesActive || s.holderAddress?.toLowerCase() === mine) &&
      (needle === "" || matches(s, needle))
  );
  const filtering = needle !== "" || minesActive;

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  // A press landing while a late page is open would otherwise strand the view
  // past the end of the list.
  const current = Math.min(page, pageCount - 1);
  const slice = results.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const firstSecond = slice[0]?.second;
  const lastSecond = slice[slice.length - 1]?.second;

  function goTo(next: number) {
    setPage(Math.max(0, Math.min(next, pageCount - 1)));
    document.getElementById("rack-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Any change to the filter invalidates the page number: page 7 of the old
  // result set is rarely page 7 of the new one.
  function search(next: string) {
    setQuery(next);
    setPage(0);
  }

  function toggleMine() {
    setMinesOnly((v) => !v);
    setPage(0);
  }

  return (
    <section aria-label="the rack">
      <h2
        id="rack-top"
        className="flex items-baseline justify-between border-b border-paper/15 pb-3 text-caption uppercase tracking-[0.28em] text-paper/60 scroll-mt-6"
      >
        <span>the rack</span>
        <span>
          {pressed.length === TOTAL_SECONDS
            ? `all ${TOTAL_SECONDS} pressed`
            : `${pressed.length} pressed · ${TOTAL_SECONDS - pressed.length} silent`}
        </span>
      </h2>

      {pressed.length === 0 ? (
        <p className="mt-4 text-body text-white/70">nobody has pressed a second yet.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="rack-search" className="sr-only">
                find a sleeve by number, name, or address
              </label>
              <input
                id="rack-search"
                type="search"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="find a sleeve — 100, catra.eth, 0x…"
                autoComplete="off"
                spellCheck={false}
                className="w-full min-h-[44px] border-b border-paper/20 bg-transparent pb-2 pr-8 text-body text-paper placeholder:text-paper/35 focus:border-paper/60 focus:outline-none transition-colors [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query !== "" && (
                <button
                  onClick={() => search("")}
                  aria-label="clear the search"
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-8 rounded text-caption text-paper/50 hover:text-paper transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {viewerAddress && (
              <button
                onClick={toggleMine}
                aria-pressed={minesOnly}
                className={`inline-flex min-h-[44px] items-center rounded border px-4 text-caption uppercase tracking-[0.16em] transition-colors ${
                  minesOnly
                    ? "border-paper/70 text-paper"
                    : "border-paper/20 text-paper/60 hover:border-paper/50 hover:text-paper"
                }`}
              >
                yours
              </button>
            )}
          </div>

          <p role="status" className="mt-4 text-caption uppercase tracking-[0.28em] text-paper/60">
            {filtering
              ? `${results.length} of ${pressed.length} pressed`
              : pageCount > 1
                ? `seconds ${firstSecond}–${lastSecond}`
                : `${pressed.length} pressed`}
          </p>

          {results.length === 0 ? (
            <p className="mt-4 text-body text-white/70 text-pretty">
              {minesActive && needle === ""
                ? "none of the seconds you hold are pressed yet."
                : `nothing in the rack matches “${query.trim()}”.`}{" "}
              <button
                onClick={() => {
                  search("");
                  setMinesOnly(false);
                }}
                className="rounded text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper transition-colors"
              >
                show everything
              </button>
            </p>
          ) : (
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {slice.map((sleeve) => (
              <li key={sleeve.tokenId} className="rack-item">
                <div className="relative">
                  <Link
                    href={`/pressed/${sleeve.tokenId}`}
                    aria-label={`open sleeve #${sleeve.second}`}
                    className="block w-full rounded-[2px] transition-transform active:scale-[0.98]"
                  >
                    <SleeveImage src={sleeve.image} size={320} sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 45vw" className="w-full brightness-[0.92] saturate-[0.9] transition-[filter,transform] duration-500 hover:brightness-100 hover:saturate-100" />
                  </Link>
                  <button
                    onClick={() => onSelect?.(sleeve.second!)}
                    aria-label={`play second ${sleeve.second} in the composition`}
                    className="absolute bottom-0 left-0 inline-flex min-h-[40px] items-center bg-paper px-3 text-caption tabular-nums tracking-[0.14em] text-[#111] transition-transform active:scale-[0.96]"
                  >
                    {trackTime(sleeve.second!)}
                  </button>
                </div>
                <p className="mt-2 text-body text-white/90">sleeve #{sleeve.second}</p>
                <p className="truncate text-caption text-paper/60">
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
                </p>
                <ShareSleeve
                  tokenId={sleeve.tokenId}
                  mine={!!mine && sleeve.holderAddress?.toLowerCase() === mine}
                  compact
                  className="mt-1"
                />
              </li>
            ))}
          </ul>
          )}

          {results.length > 0 && pageCount > 1 && (
            <nav
              aria-label="rack pages"
              className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-paper/15 pt-4"
            >
              <button
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                className="inline-flex min-h-[44px] items-center -my-2 rounded text-body text-paper/60 hover:text-paper transition-colors disabled:opacity-30 disabled:hover:text-paper/60"
              >
                ← earlier
              </button>

              <ol className="flex flex-wrap items-center justify-center gap-1">
                {Array.from({ length: pageCount }, (_, i) => (
                  <li key={i}>
                    <button
                      onClick={() => goTo(i)}
                      aria-label={`page ${i + 1} of ${pageCount}`}
                      aria-current={i === current ? "page" : undefined}
                      className={`h-11 w-8 rounded text-caption tabular-nums transition-colors ${
                        i === current ? "text-paper" : "text-paper/40 hover:text-paper/80"
                      }`}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
              </ol>

              <button
                onClick={() => goTo(current + 1)}
                disabled={current === pageCount - 1}
                className="inline-flex min-h-[44px] items-center -my-2 rounded text-body text-paper/60 hover:text-paper transition-colors disabled:opacity-30 disabled:hover:text-paper/60"
              >
                later →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
