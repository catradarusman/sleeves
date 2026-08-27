import SiteHeader from "@/components/SiteHeader";
import PressFlow from "./PressFlow";

export default function PressPage({ params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 max-w-lg mx-auto">
      <SiteHeader />
      <PressFlow tokenId={tokenId} />
    </main>
  );
}
