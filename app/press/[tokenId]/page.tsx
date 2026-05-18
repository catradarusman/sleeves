import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import PressFlow from "./PressFlow";

export default function PressPage({ params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <img src="/sleeve-art.gif" alt="273 Sleeves artwork" className="w-10 h-10 rounded object-cover opacity-80" />
          <div>
            <h1 className="text-display font-bold uppercase text-white/90">
              <Link href="/" className="hover:text-white/70 transition-colors">273 Sleeves: Sound</Link>
            </h1>
            <p className="text-caption text-white/40 mt-0.5">4′33″ onchain · Base</p>
          </div>
        </div>
        <ConnectButton />
      </div>
      <PressFlow tokenId={tokenId} />
    </main>
  );
}
