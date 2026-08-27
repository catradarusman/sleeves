"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { custom } from "viem";
import { ConnectKitProvider } from "connectkit";
import { wagmiConfig } from "@/lib/wagmi";
import { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Onchain reads must not be paused by the browser's offline guess:
        // a paused query leaves the surface stuck on its loading state.
        defaultOptions: { queries: { networkMode: "always", retry: 1 } },
      })
  );
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [miniAppConfig, setMiniAppConfig] = useState<ReturnType<typeof createConfig> | null>(null);

  useEffect(() => {
    sdk.isInMiniApp().then(async (inMiniApp) => {
      if (!inMiniApp) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = (await sdk.wallet.getEthereumProvider()) as any;
      const config = createConfig({
        chains: [base, baseSepolia],
        transports: {
          [base.id]: custom(provider),
          [baseSepolia.id]: custom(provider),
        },
      });
      setMiniAppConfig(config);
      setIsMiniApp(true);
    }).catch(() => {});
  }, []);

  if (isMiniApp && miniAppConfig) {
    return (
      <WagmiProvider config={miniAppConfig}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider theme="midnight">{children}</ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
