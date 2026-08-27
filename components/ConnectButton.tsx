"use client";

import { ConnectKitButton } from "connectkit";

/** "header" is the small status pill. "primary" is a full-width action, for
 *  the places where connecting is the only way forward. */
type Props = { variant?: "header" | "primary" };

export default function ConnectButton({ variant = "header" }: Props) {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, truncatedAddress, ensName }) =>
        variant === "primary" ? (
          <button
            onClick={show}
            className="w-full py-2.5 text-body text-center text-black bg-white rounded-lg hover:bg-white/90 transition-[background-color,transform] active:scale-[0.96]"
          >
            {isConnected ? (ensName ?? truncatedAddress) : "connect wallet"}
          </button>
        ) : (
        <button
          onClick={show}
          className="flex items-center gap-1.5 rounded text-caption uppercase tracking-[0.2em] text-paper/60 hover:text-paper transition-colors"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: isConnected ? '#22c55e' : '#444' }}
          />
          {isConnected ? (ensName ?? truncatedAddress) : 'connect'}
        </button>
        )
      }
    </ConnectKitButton.Custom>
  );
}
