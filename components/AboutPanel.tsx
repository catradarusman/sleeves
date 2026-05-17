"use client";

import { useState } from "react";

export default function AboutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/60 leading-relaxed">
        273 Sleeves holders each own one second of 4′33″ — John Cage&apos;s silent composition.
        press your second and a unique sound is generated onchain from your wallet, your token,
        and the exact block timestamp. no two sounds are the same.
      </p>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? "16rem" : 0 }}
      >
        <div className="space-y-2 pt-1">
          <p className="text-xs text-white/60 leading-relaxed">
            once all 273 are pressed, the complete 4′33″ is assembled and airdropped to every
            holder as a CC0 network composition.
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            the sounds are stored fully onchain on Base. forever.
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="text-xs text-meta hover:text-white/50 transition-colors"
      >
        {isOpen ? "read less" : "read more"}
      </button>
    </div>
  );
}
