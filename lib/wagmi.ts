import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    ssr: false,
    chains: [base, baseSepolia],
    transports: {
      [base.id]: http("https://mainnet.base.org", { batch: true }),
      [baseSepolia.id]: http("https://sepolia.base.org", { batch: true }),
    },
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "",
    appName: "273 Sleeves: Sound",
    appDescription: "Mint 1 second of 4′33″ onchain.",
    appUrl: "https://sleeves.catra.fyi",
  })
);

export { ConnectKitProvider };
