"use client";

import { ConnectKitButton } from "connectkit";

export default function ConnectButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, show, truncatedAddress, ensName }) => (
        <button
          onClick={show}
          className="flex items-center gap-1.5 text-caption text-white/40 hover:text-white/60 transition-colors"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: isConnected ? '#22c55e' : '#444' }}
          />
          {isConnected ? (ensName ?? truncatedAddress) : 'connect'}
        </button>
      )}
    </ConnectKitButton.Custom>
  );
}
