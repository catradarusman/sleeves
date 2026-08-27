import { ImageResponse } from "next/og";
import { sleeveMeta } from "@/lib/sleeveIndex";
import { TOTAL_SECONDS } from "@/constants";
import { trackTime } from "@/lib/share";

export const runtime = "edge";

// 3:2. Farcaster embeds want that ratio; X crops it to 1.91:1 from the centre,
// which is why nothing sits in the outer bands.
const WIDTH = 1200;
const HEIGHT = 800;

const PAPER = "#e8dfcd";

/**
 * A share card that shows the sleeve itself. A generic card gets scrolled past;
 * the art is the thing a stranger stops for.
 */
export async function GET(req: Request, { params }: { params: { tokenId: string } }) {
  const tokenId = parseInt(params.tokenId, 10);
  const meta = Number.isFinite(tokenId) ? sleeveMeta(tokenId) : null;
  const second = meta?.second ?? tokenId;

  // Sleeve art is an 8 MB 2048px original on Arweave. Pulling it through the
  // image optimiser keeps the card render under a crawler's patience.
  const origin = new URL(req.url).origin;
  const art = meta
    ? `${origin}/_next/image?url=${encodeURIComponent(meta.image)}&w=640&q=75`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: 80,
          background: "#111111",
          color: PAPER,
        }}
      >
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" width={480} height={480} style={{ borderRadius: 4 }} />
        ) : (
          <div style={{ width: 480, height: 480, background: "#1a1a1a", borderRadius: 4 }} />
        )}

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, letterSpacing: 8, opacity: 0.6 }}>273 SLEEVES: SOUND</div>
          <div style={{ fontSize: 180, lineHeight: 1, marginTop: 24, letterSpacing: -8 }}>
            {String(second).padStart(3, "0")}
          </div>
          <div style={{ fontSize: 32, marginTop: 32, opacity: 0.85 }}>
            {"one second of 4′33″, saved onchain"}
          </div>
          <div style={{ fontSize: 28, marginTop: 12, opacity: 0.6 }}>
            {`plays at ${trackTime(second)} · sleeve ${second} of ${TOTAL_SECONDS}`}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      // Sleeve art and text are both immutable once pressed, so the card is
      // rendered once and served from the edge after that.
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    }
  );
}
