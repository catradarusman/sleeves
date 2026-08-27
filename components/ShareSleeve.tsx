"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { isInMiniApp, openExternal } from "@/lib/miniapp";
import { farcasterComposeUrl, shareText, sleeveSecond, sleeveUrl, xComposeUrl } from "@/lib/share";

type Props = {
  tokenId: number;
  /** Changes the wording to first person. The link and art are the same. */
  mine?: boolean;
  /** Tight single row for the rack. The default is the wider stacked row. */
  compact?: boolean;
  className?: string;
};

type Pending = "farcaster" | "x" | "copy" | null;

/**
 * Sharing a press is the only distribution this project has: no ads, no feed.
 * Every pressed sleeve carries its own link, so a share points at that second
 * rather than at the front door.
 */
export default function ShareSleeve({ tokenId, mine = false, compact = false, className = "" }: Props) {
  const [pending, setPending] = useState<Pending>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // Answered once, up front. Awaiting it inside the click handler would spend
  // the user gesture, and Safari blocks a window.open that opens after that.
  const [inMiniApp, setInMiniApp] = useState(false);

  useEffect(() => {
    let live = true;
    isInMiniApp()
      .then((v) => live && setInMiniApp(v))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const url = sleeveUrl(tokenId);
  const text = shareText(tokenId, mine);
  const label = sleeveSecond(tokenId) === null ? "this sleeve" : `sleeve #${sleeveSecond(tokenId)}`;

  async function run(kind: Exclude<Pending, null>, action: () => Promise<void>) {
    if (pending) return;
    setPending(kind);
    setFailed(null);
    try {
      await action();
    } catch {
      // Pointing a failed copy at the copy link would be a loop.
      setFailed(
        kind === "copy"
          ? "your browser blocked the copy. the link is in the address bar."
          : "that didn't open. try the copy link."
      );
    } finally {
      setPending(null);
    }
  }

  const shareToFarcaster = () =>
    run("farcaster", async () => {
      if (inMiniApp) {
        await sdk.actions.composeCast({ text, embeds: [url] });
        return;
      }
      openExternal(farcasterComposeUrl(text, url), inMiniApp);
    });

  const shareToX = () =>
    run("x", async () => openExternal(xComposeUrl(text, url), inMiniApp));

  const copyLink = () =>
    run("copy", async () => {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  const buttonClass = compact
    ? "rounded text-caption text-paper/60 hover:text-paper transition-[color,transform] active:scale-[0.96] disabled:opacity-40"
    : "inline-flex min-h-[40px] items-center rounded border border-white/25 px-3 text-body text-white/80 hover:border-white/60 hover:text-white transition-[border-color,color,transform] active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className={className}>
      <div className={compact ? "flex flex-wrap items-center gap-x-3 gap-y-1" : "flex flex-wrap items-center gap-2"}>
        {!compact && (
          <span className="text-caption uppercase tracking-[0.28em] text-paper/60 mr-1">share</span>
        )}
        <button
          onClick={shareToFarcaster}
          disabled={pending !== null}
          aria-label={`share ${label} on farcaster`}
          className={buttonClass}
        >
          {pending === "farcaster" ? "opening…" : "farcaster"}
        </button>
        <button
          onClick={shareToX}
          disabled={pending !== null}
          aria-label={`share ${label} on X`}
          className={buttonClass}
        >
          {pending === "x" ? "opening…" : "X"}
        </button>
        <button
          onClick={copyLink}
          disabled={pending !== null}
          aria-label={`copy the link to ${label}`}
          className={buttonClass}
        >
          {copied ? "copied" : compact ? "link" : "copy link"}
        </button>
      </div>
      {failed && <p className="mt-2 text-caption text-red-400">{failed}</p>}
    </div>
  );
}
