import ConnectButton from "@/components/ConnectButton";
import GallerySection from "@/components/GallerySection";
import { SOUND_CONTRACT } from "@/constants";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-white/90">
            273 Sleeves: Sound
          </h1>
          <p className="text-xs text-white/40 mt-0.5">4′33″ onchain · Base</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>

      <GallerySection />

      <footer className="mt-16 text-xs text-white/20 flex justify-between">
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
    </main>
  );
}
