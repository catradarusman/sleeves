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
  title: "273 Sleeves: Sound",
  description: "Mint 1 second of 4′33″ onchain as a soulbound NFT.",
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
