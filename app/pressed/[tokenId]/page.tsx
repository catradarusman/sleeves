import SiteHeader from "@/components/SiteHeader";
import PressedView from "./PressedView";

export default function PressedPage({ params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 max-w-lg mx-auto">
      <SiteHeader />
      <PressedView tokenId={tokenId} />
    </main>
  );
}
