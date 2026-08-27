"use client";

import { useState, useEffect, useRef } from "react";
import PressFlow from "@/app/press/[tokenId]/PressFlow";

type Props = {
  tokenId: number | null;
  onClose: () => void;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function PressDrawer({ tokenId, onClose }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [visible, setVisible] = useState(false);
  // Keeps the panel mounted through its slide-out so the exit transition plays.
  const [mountedTokenId, setMountedTokenId] = useState<number | null>(tokenId);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Trigger slide-in on open, slide-out then unmount on close
  useEffect(() => {
    if (tokenId !== null) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setMountedTokenId(tokenId);
      const id = setTimeout(() => {
        setVisible(true);
        closeRef.current?.focus();
      }, 10);
      return () => clearTimeout(id);
    } else {
      setVisible(false);
      returnFocusRef.current?.focus();
      const id = setTimeout(() => setMountedTokenId(null), 300);
      return () => clearTimeout(id);
    }
  }, [tokenId]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    if (tokenId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tokenId, onClose]);

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
    ? "fixed bottom-0 left-0 right-0 h-auto max-h-[80vh] bg-[#111] border-t border-white/10 z-50 p-6 overflow-y-auto rounded-t-[20px]"
    : "fixed top-0 right-0 h-full w-80 bg-[#111] border-l border-white/10 z-50 p-6 overflow-y-auto";

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`press second #${mountedTokenId} of 273`}
        className={panelClass}
        style={panelStyle}
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-caption text-white/60">second #{mountedTokenId} of 273</span>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="close"
            className="w-10 h-10 -m-2 flex items-center justify-center rounded text-body text-white/60 hover:text-white/90 transition-[color,transform] active:scale-[0.96]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <PressFlow tokenId={mountedTokenId} onComplete={onClose} />
      </div>
    </>
  );
}
