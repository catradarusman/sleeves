"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";
import GallerySection from "@/components/GallerySection";
import AboutPanel from "@/components/AboutPanel";
import { SOUND_CONTRACT } from "@/constants";

// Keeps PressFlow (and the audio pipeline it imports) out of the home bundle.
const PressDrawer = dynamic(() => import("@/components/PressDrawer"), { ssr: false });

export default function Home() {
  const [pressTokenId, setPressTokenId] = useState<number | null>(null);

  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SiteHeader />

      <p className="mb-10 max-w-[56ch] text-body leading-[1.85] text-white/70 text-pretty">
        273 seconds of silence. pressed one at a time, onchain.
      </p>

      <GallerySection onPressCTA={(id) => setPressTokenId(id)} sidebar={<AboutPanel />} />


      <footer className="mt-20 flex items-center justify-between gap-4 border-t border-paper/15 pt-5 text-caption uppercase tracking-[0.16em] text-paper/60">
        <span>273 Sleeves · Base Mainnet</span>
        <div className="flex gap-5">
          <a
            href="https://paragraph.com/@catra/273-sleeves"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center -my-3 whitespace-nowrap rounded hover:text-paper transition-colors"
          >
            the story ↗
          </a>
          <a
            href={`https://basescan.org/address/${SOUND_CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] items-center -my-3 whitespace-nowrap rounded hover:text-paper transition-colors"
          >
            contract ↗
          </a>
        </div>
      </footer>

      <PressDrawer tokenId={pressTokenId} onClose={() => setPressTokenId(null)} />
    </main>
  );
}
