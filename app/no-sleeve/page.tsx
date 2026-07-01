"use client";

import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import GallerySection from "@/components/GallerySection";

export default function NoSleeve() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <img src="/sleeve-art.gif" alt="273 Sleeves artwork" className="w-10 h-10 rounded object-cover opacity-80 outline outline-1 -outline-offset-1 outline-white/10" />
          <div>
            <h1 className="text-display font-bold uppercase text-white/90 text-balance">
              <Link href="/" className="hover:text-white/70 transition-colors">273 Sleeves: Sound</Link>
            </h1>
            <p className="text-caption text-white/40 mt-0.5">4′33″ onchain · Base</p>
          </div>
        </div>
        <ConnectButton />
      </div>

      <div className="mb-6 text-xs text-white/50 space-y-2">
        <p>you don&apos;t hold a sleeve.</p>
        <a
          href="https://highlight.xyz/mint/base:0x4428be530724b5ee47e4cb0061f77024933a4dc3"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-white/40 hover:text-white transition-colors"
        >
          get a sleeve on Highlight →
        </a>
      </div>

      <GallerySection />
    </main>
  );
}
