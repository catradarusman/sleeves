"use client";

import { useState } from "react";

export default function AboutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-body text-white/60 text-pretty">
        273 Sleeves holders each own one second of 4′33″, John Cage&apos;s silent composition.
        press your second and a sound is generated onchain from your wallet, your token, and the
        block timestamp. no two sounds are the same.
      </p>

      <div
        className="overflow-hidden transition-[max-height] duration-300"
        style={{ maxHeight: isOpen ? "16rem" : 0 }}
      >
        <div className="space-y-2 pt-1">
          <p className="text-body text-white/60 text-pretty">
            once all 273 are pressed, the complete 4′33″ is assembled and airdropped to every
            holder as a CC0 network composition.
          </p>
          <p className="text-body text-white/60 text-pretty">
            the sounds are stored fully onchain on Base. forever.
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="text-body text-white/60 rounded hover:text-white/90 transition-colors"
      >
        {isOpen ? "read less" : "read more"}
      </button>
    </div>
  );
}
