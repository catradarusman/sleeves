"use client";

import { useState } from "react";

export default function AboutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        {isOpen ? "close" : "about this work"}
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? "24rem" : 0 }}
      >
        <div className="border border-white/10 p-4 mt-2 space-y-3">
          <p className="text-xs text-white/90 font-bold mb-2">4′33″ by John Cage (1952)</p>
          <p className="text-xs text-white/60 leading-relaxed">
            273 Sleeves holders each own one second of 4′33″ — John Cage&apos;s silent composition.
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            press your second and a unique sound is generated onchain: a 1-second audio fragment derived from your wallet, your token, and the exact block timestamp of your press. no two sounds are the same.
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            once all 273 are pressed, the complete 4′33″ is assembled and airdropped to every holder as a CC0 network composition.
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            the sounds are stored fully onchain on Base. forever.
          </p>
        </div>
      </div>
    </div>
  );
}
