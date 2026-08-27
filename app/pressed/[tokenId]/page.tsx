import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import PressedView from "./PressedView";
import { SITE_URL, sleeveSecond, sleeveUrl, trackTime } from "@/lib/share";
import { TOTAL_SECONDS } from "@/constants";

// A shared sleeve gets its own card: its number, its art, its place in the
// 4′33″. The front door is one tap further in, which is where the next press
// comes from.
export function generateMetadata({ params }: { params: { tokenId: string } }): Metadata {
  const tokenId = parseInt(params.tokenId, 10);
  const second = sleeveSecond(tokenId);
  const title =
    second === null
      ? "273 Sleeves: Sound"
      : `sleeve #${second} of ${TOTAL_SECONDS} · 273 Sleeves: Sound`;
  const description =
    second === null
      ? "one second of 4′33″, generated onchain and saved there forever."
      : `one second of 4′33″, generated onchain and saved there forever. it plays at ${trackTime(second)}.`;
  const image = `${SITE_URL}/api/og/${tokenId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: sleeveUrl(tokenId),
      siteName: "273 Sleeves: Sound",
      images: [{ url: image, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: "1",
        imageUrl: image,
        button: {
          title: "Press Your Second",
          action: {
            type: "launch_frame",
            name: "273 Sleeves: Sound",
            url: sleeveUrl(tokenId),
            splashImageUrl: `${SITE_URL}/icon.png`,
            splashBackgroundColor: "#111111",
          },
        },
      }),
    },
  };
}

export default function PressedPage({ params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  return (
    <main className="min-h-screen px-4 pt-4 pb-10 sm:px-6 lg:px-8 max-w-lg lg:max-w-5xl mx-auto">
      <SiteHeader />
      <PressedView tokenId={tokenId} />
    </main>
  );
}
