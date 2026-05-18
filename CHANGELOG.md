# Changelog

All notable changes to the 273 Sleeves: Sound web app.

---

## [Unreleased]

### Fixed
- ENS names now resolve and display in the pressed gallery. `getAllPressedSeconds()` in `lib/sleeves.ts` was hardcoding `ensName: null` for every holder — it now resolves all holder addresses against Ethereum mainnet in parallel after the Base contract reads complete. Deduplicated lookups via `Promise.allSettled` (failures gracefully fall back to `null`). An optional `NEXT_PUBLIC_ETH_RPC_URL` env var overrides the default public endpoint (`https://eth.llamarpc.com`). No changes to `GalleryPlayer` — it already conditionally displayed `ensName` over the truncated address throughout the info panel, holder pins, and tooltips.

---

## [drawer-refactor] — 2026-05-15 — single-page press flow

### Added
- `PressDrawer` component (`components/PressDrawer.tsx`): slide-in panel that hosts the entire press flow without leaving the gallery. Desktop: right-side panel (`fixed right-0`, `w-80`, full height, `border-l`). Mobile (< 640px): bottom sheet (`fixed bottom-0`, `max-h-[80vh]`, rounded top). Overlay (`bg-black/50 z-40`) dims the gallery behind. CSS `translate` transition from off-screen to visible triggered 10ms after mount. Closing via `×` button or overlay click unmounts the component, resetting `PressFlow` state cleanly.

### Changed
- `app/page.tsx`: converted to client component to hold `pressTokenId: number | null` state. Passes `onPressCTA` down to `GallerySection`. Renders `<PressDrawer>` at the bottom of the page tree.
- `GallerySection`: accepts `onPressCTA?: (tokenId: number) => void`. When provided, the "you have N second(s) waiting →" holder CTA renders as a `<button>` calling `onPressCTA(unpressedIds[0])` instead of navigating to `/press/[id]`. Falls back to the original `<a>` link when `onPressCTA` is not provided.
- `PressFlow`: accepts `onComplete?: () => void`. When set: `runAudioAndSeal` waits 1500ms on the done state (instead of 600ms) then calls `onComplete()` instead of `router.push`. The already-pressed redirect also calls `onComplete()` rather than routing away. Done step shows `"second #N is sealed."` copy plus an inline Farcaster share link. Standalone page behavior unchanged when `onComplete` is undefined.
- `ConnectButton`: removed auto-route-on-connect behavior. Connecting a wallet no longer navigates away from `/`. The "press your second →" / "finish sealing →" header links remain. Removed unused `useRouter`, `usePathname`, `useRef`, `prevStatus`, and `status` from the component.
- All page headers (`app/page.tsx`, `app/press/[tokenId]/page.tsx`, `app/pressed/[tokenId]/page.tsx`, `app/press/page.tsx`, `app/no-sleeve/page.tsx`): `"273 Sleeves: Sound"` title wrapped in `<Link href="/">` with `hover:text-white/70 transition-colors`.

---

## [0efdc2d] — 2026-05-15 — checkpoint before drawer refactor

### Changed
- `PressFlow` recovery block: rewritten with clearer two-paragraph explanation — identifies the exact failure point (tx1 succeeded, tx2 didn't), explains cost (one more transaction). Button restyled to match press flow conventions (`seal the audio →`).
- `ConnectButton`: added unsealed-second detection. On connect and on page load, fans out parallel `isPressed` + `getAudio` reads for every wallet-owned token. If any token has `isPressed === true` and no audio sealed (`audioHex.length <= 2`), the header link switches from `"press your second →"` to `"finish sealing second #N →"` in amber (`text-amber-400/80`), the only non-white color in the app — signals urgency. Cleans up with a cancellation flag on disconnect.

---

## [2259da2] — 2026-05-15

### Added
- `AboutPanel` component: toggleable inline `"about this work"` / `"close"` panel with static copy about 4′33″, CC0 airdrop mechanics, and onchain storage. Placed above the footer in `app/page.tsx`. `max-height` CSS transition, no new dependencies.

### Changed
- `GallerySection`: holder-aware CTA query key now includes `totalPressed` so the CTA re-evaluates when new seconds are pressed, not just on wallet change.
- `GalleryPlayer`: mobile-aware segment sizing — 8px wide on viewport < 640px, 4px on desktop. Zero gap on mobile. `touchAction: "pan-x"` on the timeline scroll container to preserve horizontal scrolling.
- `GalleryPlayer`: two-step tap interaction on mobile — first tap selects and opens info panel, second tap on same segment seeks and plays. Desktop behavior unchanged.
- `PressFlow`: confirmation checkpoint added between the initial "press it →" click and the wallet transaction. Shows a permanent-action warning, a checkbox ("i understand, press my second"), confirm button (disabled until checked), and a "go back" escape. No transaction fires until the checkbox is checked and confirmed.

---

## [de55091] — 2026-05-15

### Added
- `GallerySection`: holder-aware CTA — after gallery data loads, cross-references wallet-owned tokens against `pressedSeconds`. Renders "you have N second(s) waiting →" linking to `/press/[id]` (single) or `/press` (multiple). Uses `useAccount` + `useQuery` with `enabled: !!address`. Shows nothing until resolved.

---

## [546acf6] — 2026-05-15

### Changed
- `PressFlow` loading states: replaced flat step text with animated 3-state progress sequence. Each active state shows monospace copy (`locking second #N...` / `synthesizing your sound...` / `sealing it onchain...`) with a blinking `_` cursor (pure CSS `blink` keyframe). Step context (`1 of 2` / `2 of 2`) shown for tx steps. A brief `done.` flash fires for 600ms before redirect.
- `PressFlow` Screen C copy: replaced explainer paragraph with new copy emphasizing uniqueness and irreversibility. Button relabeled `"press it →"`, widened, border transitions from 60% → 100% white opacity on hover over 200ms.
- `PressedView` Screen D waveform reveal: waveform now draws left-to-right over 800ms via `max-width` CSS transition. Confirmation copy `"second #N is sealed."` fades in after waveform completes. Subline `"it will play at M:SS in the 4′33″."` fades in 400ms later. M:SS derived from `tokenId`: `(N-1)` seconds into 4:33.
- `GallerySection`: counter upgraded from `text-xs` to `text-sm`, moved above timeline with `mb-4`. When `totalPressed >= 260`, shows `"[X] seconds remain"` in `text-white/30`.
- `GalleryPlayer`: `title` tooltips on all timeline segments — pressed: `"second #N — pressed by 0x…"`, unpressed: `"second #N — not yet pressed"`. Share on Farcaster link added to info panel when `hasAudio === true`.

---

## [79ec887]

### Changed
- Gallery and press flow now use chunked multicall batching to read contract state for all 273 tokens without hitting RPC limits.
- Added support for a private RPC endpoint via environment variable for full-supply scalability.

---

## [7dc952c]

### Fixed
- Gallery and press picker scoped multicalls to minted tokens only, preventing failures on unminted token IDs.

---

## [8ff5dd5]

### Removed
- QA debug logs stripped before mainnet deploy.

---

## [0faffe3]

### Added
- Initial 273 Sleeves Sound web app: Next.js 14, Tailwind, wagmi/viem, ConnectKit.
- `PressFlow`: two-transaction press flow — `mintSound` (tx1) → audio generation → `setAudio` (tx2). Recovery mode for wallets that completed tx1 but not tx2.
- `PressedView`: Screen D (own press) and Screen E (someone else's press). Audio playback via Web Audio API. Waveform canvas rendering.
- `GallerySection` + `GalleryPlayer`: scrollable timeline of 273 segments, transport controls, holder pins, info panel.
- `GallerySection`: `"X seconds remain"` line when approaching sell-out.
- Seed derivation and onchain OGG audio generation (`lib/seed.ts`, `lib/audio.ts`).
- Contract ABIs and address config (`lib/contracts.ts`).
