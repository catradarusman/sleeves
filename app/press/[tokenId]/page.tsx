import SiteHeader from "@/components/SiteHeader";
import PressFlow from "./PressFlow";

export default async function PressPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const tokenId = parseInt((await params).tokenId, 10);
  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 lg:px-8 max-w-lg mx-auto">
      <SiteHeader />
      <PressFlow tokenId={tokenId} />
    </main>
  );
}
