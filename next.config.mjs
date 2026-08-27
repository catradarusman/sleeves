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
  },
  webpack: (config) => {
    config.resolve.alias['@react-native-async-storage/async-storage'] = false;
    config.resolve.alias['pino-pretty'] = false;
    return config;
  },
};

export default nextConfig;
