"use client";

import SiteHeader from "@/components/SiteHeader";
import GallerySection from "@/components/GallerySection";
import AboutPanel from "@/components/AboutPanel";

export default function NoSleeve() {
  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <SiteHeader />

      <div className="mb-8 space-y-2 max-w-prose">
        <p className="text-body text-white/60">you don&apos;t hold a sleeve.</p>
        <a
          href="https://highlight.xyz/mint/base:0x4428be530724b5ee47e4cb0061f77024933a4dc3"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-body text-white/90 underline underline-offset-4 hover:text-white transition-colors rounded"
        >
          get a sleeve on Highlight →
        </a>
      </div>

      <GallerySection sidebar={<AboutPanel />} />
    </main>
  );
}
