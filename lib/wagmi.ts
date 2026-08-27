import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { ConnectKitProvider } from "connectkit";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// Same endpoints the read layer uses, so a configured provider covers wallet
// writes too instead of leaving them on the rate-limited public node.
const BASE_RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://mainnet.base.org";
const BASE_SEPOLIA_RPC = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA ?? "https://sepolia.base.org";

// WalletConnect is only offered when a project id exists: an empty id makes the
// connector fail at connect time rather than at build time. It costs nothing in
// first-load JS — ConnectKit loads the transport lazily when a user picks it.
const connectors = [
  injected(),
  coinbaseWallet({
    appName: "273 Sleeves: Sound",
    appLogoUrl: "https://sleeves.catra.fyi/icon.png",
  }),
  ...(WALLETCONNECT_PROJECT_ID
    ? [
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
          metadata: {
            name: "273 Sleeves: Sound",
            description: "Mint 1 second of 4′33″ onchain.",
            url: "https://sleeves.catra.fyi",
            icons: ["https://sleeves.catra.fyi/icon.png"],
          },
          showQrModal: false, // ConnectKit renders the QR itself
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  ssr: false,
  chains: [base, baseSepolia],
  connectors,
  transports: {
    [base.id]: http(BASE_RPC, { batch: true }),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC, { batch: true }),
  },
});

export { ConnectKitProvider };
