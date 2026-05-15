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

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Trigger slide-in after mount
  useEffect(() => {
    if (tokenId !== null) {
      const id = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(id);
    } else {
      setVisible(false);
    }
  }, [tokenId]);

  if (tokenId === null) return null;

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
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <div className={panelClass} style={panelStyle}>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-white/50">second #{tokenId} of 273</span>
          <button
            onClick={onClose}
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            ×
          </button>
        </div>
        <PressFlow tokenId={tokenId} onComplete={onClose} />
      </div>
    </>
  );
}
