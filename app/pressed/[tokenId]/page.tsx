import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";
import PressedView from "./PressedView";

export default function PressedPage({ params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-white/90">
            <Link href="/" className="hover:text-white/70 transition-colors">273 Sleeves: Sound</Link>
          </h1>
          <p className="text-xs text-white/40 mt-0.5">4′33″ onchain · Base</p>
        </div>
        <ConnectButton />
      </div>
      <PressedView tokenId={tokenId} />
    </main>
  );
}
