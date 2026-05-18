import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sleeves.catra.fyi"),
  title: "273 Sleeves: Sound",
  description: "Mint 1 second of 4′33″ onchain as a soulbound NFT.",
  openGraph: {
    title: "273 Sleeves: Sound",
    description: "273 holders, each owning one second of 4′33″ by John Cage. Press yours onchain.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "273 Sleeves: Sound" }],
    url: "https://sleeves.catra.fyi",
    siteName: "273 Sleeves: Sound",
  },
  twitter: {
    card: "summary_large_image",
    title: "273 Sleeves: Sound",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} font-mono bg-[#111] text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
