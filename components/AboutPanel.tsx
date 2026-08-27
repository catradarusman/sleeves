"use client";

import { useState } from "react";

export default function AboutPanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-body text-white/60 text-pretty">
        273 Sleeves holders each own one second of 4′33″, John Cage&apos;s silent composition.
        press your second and three facts — your wallet, your token number, the moment Base
        records the press — become one sound. no other press makes it.
      </p>

      <div
        className="overflow-hidden transition-[max-height] duration-300"
        style={{ maxHeight: isOpen ? "32rem" : 0 }}
      >
        <div className="space-y-2 pt-1">
          <p className="text-body text-white/60 text-pretty">
            your browser builds the sound from those three facts, then writes it into the
            contract. the same three facts always build the same sound, so anyone can rebuild
            yours and check it is real.
          </p>
          <p className="text-body text-white/60 text-pretty">
            once all 273 are pressed, the complete 4′33″ is assembled and airdropped to every
            holder as a CC0 network composition.
          </p>
          <p className="text-body text-white/60 text-pretty">
            the sound lives in the contract on Base. no server, no IPFS. it plays as long as
            Base does.
          </p>
        </div>
      </div>

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex min-h-[40px] items-center -my-2.5 text-body text-white/60 rounded hover:text-white/90 transition-colors"
      >
        {isOpen ? "read less" : "read more"}
      </button>
    </div>
  );
}
