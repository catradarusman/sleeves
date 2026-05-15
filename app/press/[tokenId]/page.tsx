import ConnectButton from "@/components/ConnectButton";
import PressFlow from "./PressFlow";

export default function PressPage({ params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  return (
    <main className="min-h-screen px-4 py-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-white/90">
            273 Sleeves: Sound
          </h1>
          <p className="text-xs text-white/40 mt-0.5">4′33″ onchain · Base</p>
        </div>
        <ConnectButton />
      </div>
      <PressFlow tokenId={tokenId} />
    </main>
  );
}
