/** @type {import('next').NextConfig} */
// No COOP/COEP headers: @ffmpeg/core 0.12.9 is the single-threaded build, so it
// needs no SharedArrayBuffer, and require-corp broke the Coinbase Wallet popup.
const nextConfig = {
  images: {
    // Sleeve artwork lives on Arweave at 2048px. next/image downscales and
    // caches it so the rack ships thumbnails, not 4 MB originals.
    remotePatterns: [
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "gateway.irys.xyz" },
    ],
    // Next 16 allows only q=75 by default. SleeveImage asks for 70; the OG
    // route requests 75 from /_next/image directly.
    qualities: [70, 75],
  },
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    config.resolve.alias['pino-pretty'] = false;
    return config;
  },
};

export default nextConfig;
