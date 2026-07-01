"use client";

import { useState, useEffect } from "react";
import PressFlow from "@/app/press/[tokenId]/PressFlow";

type Props = {
  tokenId: number | null;
  onClose: () => void;
};

export default function PressDrawer({ tokenId, onClose }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [visible, setVisible] = useState(false);
  // Keeps the panel mounted through its slide-out so the exit transition plays.
  const [mountedTokenId, setMountedTokenId] = useState<number | null>(tokenId);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Trigger slide-in on open, slide-out then unmount on close
  useEffect(() => {
    if (tokenId !== null) {
      setMountedTokenId(tokenId);
      const id = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(id);
    } else {
      setVisible(false);
      const id = setTimeout(() => setMountedTokenId(null), 300);
      return () => clearTimeout(id);
    }
  }, [tokenId]);

  if (mountedTokenId === null) return null;

  const panelStyle = isMobile
    ? {
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 300ms ease-out",
      }
    : {
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms ease-out",
      };

  const panelClass = isMobile
    ? "fixed bottom-0 left-0 right-0 h-auto max-h-[80vh] bg-[#111] border-t border-white/10 z-50 p-6 overflow-y-auto rounded-t-lg"
    : "fixed top-0 right-0 h-full w-80 bg-[#111] border-l border-white/10 z-50 p-6 overflow-y-auto";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      <div className={panelClass} style={panelStyle}>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-white/50">second #{mountedTokenId} of 273</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 -m-2 flex items-center justify-center text-base text-meta hover:text-white/60 transition-[color,transform] active:scale-[0.96]"
          >
            ×
          </button>
        </div>
        <PressFlow tokenId={mountedTokenId} onComplete={onClose} />
      </div>
    </>
  );
}
