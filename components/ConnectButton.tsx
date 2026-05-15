"use client";

import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { getTokensOwnedBy } from "@/lib/sleeves";

export default function ConnectButton() {
  const { address, status, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const prevStatus = useRef<string>();

  // Auto-route on connect, but only from the home page
  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (prev !== "connected" && status === "connected" && address && pathname === "/") {
      getTokensOwnedBy(address).then((ids) => {
        if (ids.length === 0) router.push("/no-sleeve");
        else if (ids.length === 1) router.push(`/press/${ids[0]}`);
        else router.push("/press");
      });
    }
  }, [status, address, router, pathname]);

  return (
    <div className="flex items-center gap-3">
      {isConnected && (
        <Link
          href="/press"
          className="text-xs text-white/50 hover:text-white transition-colors"
        >
          press your second →
        </Link>
      )}
      <ConnectKitButton />
    </div>
  );
}
