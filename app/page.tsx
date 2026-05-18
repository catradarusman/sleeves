"use client";

import { useState } from "react";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import GallerySection from "@/components/GallerySection";
import AboutPanel from "@/components/AboutPanel";
import PressDrawer from "@/components/PressDrawer";
import { SOUND_CONTRACT } from "@/constants";

export default function Home() {
  const [pressTokenId, setPressTokenId] = useState<number | null>(null);

  return (
    <main className="min-h-screen px-4 pt-4 pb-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src="/sleeve-art.gif" alt="273 Sleeves artwork" className="w-10 h-10 rounded object-cover opacity-80" />
          <div>
            <h1 className="text-display font-bold uppercase text-white/90">
              <Link href="/" className="hover:text-white/70 transition-colors">273 Sleeves: Sound</Link>
            </h1>
            <p className="text-caption text-white/40 mt-0.5">4′33″ onchain · Base</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>

      <p className="text-body text-white/40 mb-4">
        273 seconds of silence, pressed onchain one by one.
      </p>

      <GallerySection onPressCTA={(id) => setPressTokenId(id)} />

      <div className="mt-8">
        <AboutPanel />
      </div>

      <footer className="mt-16 text-xs text-meta flex justify-between">
        <span>273 Sleeves · Base Mainnet</span>
        <a
          href={`https://basescan.org/address/${SOUND_CONTRACT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white/50 transition-colors"
        >
          contract ↗
        </a>
      </footer>

      <PressDrawer tokenId={pressTokenId} onClose={() => setPressTokenId(null)} />
    </main>
  );
}
