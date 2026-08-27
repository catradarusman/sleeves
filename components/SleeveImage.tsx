"use client";

import Image from "next/image";

type Props = {
  src: string | null;
  /** Label shown when this second has no sleeve: silence, drawn as hatching. */
  emptyLabel?: string;
  /** Rendered width in CSS pixels. Drives what next/image downscales to. */
  size: number;
  /** Overrides the sizes hint for tiles that paint fluid rather than fixed. */
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/**
 * A sleeve, shrink-wrapped. The sheen is a screen-blended gradient rather than
 * an image overlay, so it costs nothing and adapts to whatever art sits under it.
 */
export default function SleeveImage({ src, size, sizes, emptyLabel, priority = false, className = "" }: Props) {
  return (
    <span
      className={`relative block aspect-square overflow-hidden rounded-[2px] ${className}`}
      style={
        src
          ? undefined
          : {
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(232,223,205,0.07) 0 6px, transparent 6px 12px)",
            }
      }
    >
      {!src && emptyLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-caption uppercase tracking-[0.2em] text-paper/40">
          {emptyLabel}
        </span>
      )}
      {src && (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          priority={priority}
          sizes={sizes ?? `${size}px`}
          quality={70}
          className="h-full w-full object-cover"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            "linear-gradient(118deg, transparent 32%, rgba(255,255,255,0.16) 43%, transparent 53%, transparent 72%, rgba(255,255,255,0.08) 79%, transparent 87%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[2px] outline outline-1 -outline-offset-1 outline-white/10"
      />
    </span>
  );
}
