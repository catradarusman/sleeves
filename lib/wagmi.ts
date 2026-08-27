import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { ConnectKitProvider } from "connectkit";

// Only browser-extension and Coinbase wallets are offered. WalletConnect costs
// ~100 kB of first-load JS and duplicates what those two already cover here.
export const wagmiConfig = createConfig({
  ssr: false,
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "273 Sleeves: Sound", appLogoUrl: "https://sleeves.catra.fyi/icon.png" }),
  ],
  transports: {
    [base.id]: http("https://mainnet.base.org", { batch: true }),
    [baseSepolia.id]: http("https://sepolia.base.org", { batch: true }),
  },
});

export { ConnectKitProvider };
