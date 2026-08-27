# Home / listening surface redesign plan

Scope: `app/page.tsx`, `components/GallerySection.tsx`, `components/GalleryPlayer.tsx`, the shared page shell, `lib/sleeves.ts` read layer.
Out of scope: `lib/seed.ts`, `lib/audio.ts` synthesis, `lib/contracts.ts`, the press flow step model and its recovery path, `/press` picker and `/no-sleeve` beyond adopting the shared header.

Priority order for every decision below: honest > useful > as little design as possible > thorough > environmentally friendly.

---

## 1. Information architecture

Derived from two tasks: (A) holder presses their second; (B) any visitor listens and sees who pressed what.

```
<SiteHeader>              identity + connect            (shared, 4 routes)
  logo (static frame) · "273 Sleeves: Sound" · "4′33″ onchain · Base" · ConnectButton

<YourSleeve>              task A — exactly one slot, one state at a time
  connected + unpressed sleeve   → "press second #42"      (opens drawer)
  connected + unsealed audio     → "finish sealing #42"    (→ /press/42)
  connected + no sleeve          → "get a sleeve"          (external)
  connected + all pressed        → nothing rendered
  not connected                  → "connect to press your second" (= ConnectButton target)

<Composition>             task B — one player, one seek control
  status line   "42 of 273 seconds pressed"                (mint progress, ONE readout)
  waveform      canvas, aria-hidden, painted from pressed set
  seek          <input type="range" min=1 max=273>         (THE seek control)
  transport     play/stop button · "0:41 / 4:33"           (ONE playback readout)
  <SecondDetail>  the second the range is currently on:
                 "second #42 — pressed by vitalik.eth, 14 may 2025, audio sealed"
                 or "second #42 — not pressed yet" + get-a-sleeve link
  error state   "can't reach Base right now" + retry
  loading state skeleton status line + disabled transport
  empty state   "no seconds pressed yet. 4′33″ of silence."

<AboutPanel>              unchanged
<footer>                  unchanged
```

Removed from the tree: holder pin row, "jump to now", scrubber, per-segment click targets, timeline legend + "click to seek · hover for info", the mint progress bar in `GallerySection` (its number survives, its bar does not), hover info panel (folded into `SecondDetail`, driven by range value only), duplicated headers in three routes, `MOCK_PRESSED`.

Deleting any remaining element breaks a task: header = identity/connect, YourSleeve = task A, range = seek, transport = play + position, SecondDetail = "who pressed what", status = supply truth.

---

## 2. Listening flow — current vs new

```
CURRENT (5 affordances to reach one second)          NEW (1 affordance)

 ┌───────────────────────────────────────┐            ┌───────────────────────────────────────┐
 │ ▏▎▍▁▂ 273 clickable divs, h-scroll   │ seek #1    │ 42 of 273 seconds pressed             │ status
 │ (no tabindex, no role, title= only)  │            │ ▁▂▇▂▁▇▁▁▂▇▂▁▁▁▂▇▁▁▂▁ (canvas, decor) │
 ├───────────────────────────────────────┤            │ ●────────────────────────  range      │ seek (only)
 │ legend  ·  "click to seek·hover info"│            │ [▶ play]   0:41 / 4:33                │ transport
 ├───────────────────────────────────────┤            ├───────────────────────────────────────┤
 │ (av)(av)(av) holder pins, buttons    │ seek #2    │ second #42                            │
 ├───────────────────────────────────────┤            │ pressed by vitalik.eth · 14 may 2025  │ detail
 │ [▶] 0:41 ──────●────────── 4:33      │ seek #3    │ audio sealed · share →                │
 │      (bar is a div with onClick)     │            └───────────────────────────────────────┘
 ├───────────────────────────────────────┤
 │ "jump to now" button                 │ seek #4     keyboard: Tab → range; ←/→ ±1s;
 ├───────────────────────────────────────┤            ↑/↓ ±1s; PgUp/PgDn ±10s; Home/End;
 │ info panel  [▶ play this second]     │ seek #5    Space/Enter on play button toggles.
 └───────────────────────────────────────┘            Range change while playing = re-seek.
 plus separate mint bar + count above,
 plus "N of 273" again in GallerySection
```

Behaviour rules for the new player:
- The range value is the single source of playback position. Playing advances it; the user dragging or arrowing it seeks.
- Play/stop button is labelled by what it does. `stop` resets to second 1 and says "stop"; there is no fake pause glyph. (Or implement real pause — resume from `value`. Pick one and label it truthfully; recommended: real pause, since `startPlayback(value-1)` already exists.)
- `aria-valuetext` on the range: `"second 42 of 273, pressed by vitalik.eth"` / `"second 42 of 273, not pressed"`.
- No auto-scroll, no idle animation, nothing moves unless audio is playing.

---

## 3. States checklist

| State | Where | Token / component |
| --- | --- | --- |
| empty (0 pressed) | `Composition` | `text-body text-white/60`, copy "no seconds pressed yet. 4′33″ of silence." Range disabled. |
| loading | `Composition`, `YourSleeve` | `text-body text-white/60` "reading Base…"; transport + range `disabled:opacity-40 disabled:cursor-not-allowed` |
| error | `Composition` (new `ReadError`) | `text-body text-white/60` "can't reach Base right now." + `retry` button (`border border-white/40`), no mock rows anywhere |
| success (press done) | unchanged `PressedView.tsx:114-144` | untouched reveal sequence |
| focus | every control | new global `.focusable` / Tailwind `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70` applied to button, a, input, label |
| disabled | transport, range, press CTA | single rule `disabled:opacity-40 disabled:cursor-not-allowed` (replaces today's `disabled:opacity-20`) |
| hover | buttons/links | `hover:` colour step only, no size change; `active:scale-[0.96]` kept |

Type scale: only `text-display` / `text-label` / `text-body` / `text-caption`. Every `text-xs`, `text-sm`, `text-[9px]`, `text-[10px]` in touched files is replaced. Informational text is `white/60` (4.9:1) or brighter; `white/40`, `white/30`, `white/20`, `text-meta` are retired from informational use and may remain only on non-informational decoration.

Copy rewrites: "260 — airdrop" → "airdrop unlocks at 260 pressed"; "mock data — contract reads unavailable" → deleted with the mock; "audio not yet sealed onchain" / "unsealed" → "your sound isn't saved onchain yet"; "click to seek · hover for info" → deleted; step labels `lock/generate/seal` → "reserving your second" / "making the sound" / "saving it onchain"; raw viem passthrough → mapped sentences (user rejected, insufficient funds, wrong network, RPC unreachable, everything else → "the transaction didn't go through. try again.").

---

## 4. Moves, files, verification

**M1 — honest data (principle #6).**
Files: `lib/sleeves.ts`, `components/GallerySection.tsx`.
Change: delete `MOCK_PRESSED` (lines 13-49), `placeholderData` (line 67), the `?? MOCK_PRESSED` fallbacks (70-72), and the mock notice (185-189). `useQuery` returns `status: "pending" | "error" | "success"`; render loading / `ReadError` / data respectively.
Verify: block `mainnet.base.org` in devtools → the surface shows "can't reach Base right now" and a retry that recovers when unblocked. `grep -r MOCK_ web/` returns nothing.

**M2 — one seek control (principles #2, #10).**
Files: new `components/Composition.tsx` (replaces `GalleryPlayer.tsx`), `components/GallerySection.tsx`.
Change: port only the audio scheduler (`GalleryPlayer.tsx:60-186`) into the new component. The render tree is written from §1, not ported. Range input + canvas waveform + transport + detail. Delete segments (244-278), scrubber (355-372), pins (312-338), "jump to now" (285-294), auto-scroll (202-209), legend (299-309), hover state entirely.
Verify: keyboard-only walkthrough below.

**M3 — states + focus + dialog (principle #8).**
Files: `app/globals.css` (focus token), `components/PressDrawer.tsx`, `app/press/[tokenId]/PressFlow.tsx:175-181`.
Change: add focus-visible utility and apply everywhere; drawer gets `role="dialog"`, `aria-modal="true"`, `aria-label`, Escape-to-close, focus moved to the close button on open and returned to the trigger on close, focus trapped while open; `toUserError` maps viem errors (`UserRejectedRequestError`, `InsufficientFundsError`, chain mismatch, `HttpRequestError`) to sentences.
Verify: open drawer with keyboard, Tab cycles inside it only, Escape closes, focus returns to the press button. Reject a transaction in the wallet → "you cancelled the transaction." not a hex dump.

**M4 — stop paying for bytes (principle #9).**
Files: `lib/sleeves.ts`, `lib/useUnsealedToken.ts`, `app/page.tsx`, `public/`.
Change:
- `getAllPressedSeconds` no longer multicalls `getAudio` (lines 150-156, 168). The contract exposes no length getter, so derive both facts from logs: `SecondPressed(tokenId, presser, timestamp)` and `AudioSet(tokenId, audioSize)` via `getLogs` from a new `NEXT_PUBLIC_DEPLOY_BLOCK`, chunked to the RPC's block-range cap. `hasAudio = audioSize > 0`. One `isPressed` multicall may stay as a cheap consistency check; nothing fetches OGG payloads for metadata.
- `useUnsealedToken` (lines 28-34) drops its `getAudio` read the same way.
- Replace `/sleeve-art.gif` (326 KB, animated, always looping) with a static first frame `public/sleeve-art.png` in `SiteHeader`.
- Lazy-load `PressDrawer` with `next/dynamic({ ssr: false })` so `PressFlow` → `lib/audio` leaves the home bundle; keep `preloadEncoder()` behind the existing holder condition.
- Re-measure connectors; drop WalletConnect from `getDefaultConfig` only if the Farcaster + injected + Coinbase set covers the audience.
Verify: `next build` shows `/` first load JS < 500 kB; devtools network on `/` shows zero `getAudio` calls and no `.gif`; `prefers-reduced-motion: reduce` shows no animation anywhere (also removes `animate-pulse` on the step dots).

**M5 — one scale, one voice (principles #3, #4).**
Files: `components/*`, `app/page.tsx`, `app/press/page.tsx`, `app/no-sleeve/page.tsx`, `app/press/[tokenId]/PressFlow.tsx`.
Change: new `components/SiteHeader.tsx` used by all four routes; the four-size scale only; `white/60` floor for informational text; one button radius (`rounded`) and one disabled rule; copy rewrites from §3.
Verify: `grep -rE "text-xs|text-sm|text-\[9px\]|text-\[10px\]" app components` returns nothing; `grep -rn "white/40\|white/30\|white/20\|text-meta" app components` returns only decoration; contrast spot-check of every text node ≥ 4.5:1.

**M6 — COEP vs ffmpeg CDN (pre-ship blocker, outside the ten principles).**
Files: `next.config.mjs:8-19`, `lib/audio.ts:170-179` (minimal, load-URL only).
Finding: `Cross-Origin-Embedder-Policy: require-corp` is global; `ff.load()` uses the unpkg default core URL. If unpkg does not serve `Cross-Origin-Resource-Policy: cross-origin`, audio generation is dead in production.
Change: reproduce first on a production build. If blocked, self-host `@ffmpeg/core-mt` from `public/ffmpeg/` and pass `coreURL`/`wasmURL`/`workerURL` through `toBlobURL`. No change to synthesis.
Verify: production build, press flow on Base Sepolia, sound generated and sealed, console clean of `ERR_BLOCKED_BY_RESPONSE`.

### Keyboard-only walkthrough (must pass before cutover)
1. Load `/`. Tab 1 → skip/header link, Tab → ConnectButton, focus ring visible on each.
2. Tab → press CTA (holder) or get-a-sleeve. Enter opens the drawer; focus lands inside; Escape closes; focus returns to the CTA.
3. Tab → play button. Enter starts playback; the label reads what it does; the time readout advances.
4. Tab → seek range. `→` moves to second 42; `PgUp` to 52; `End` to 273; `Home` to 1. Audio follows every seek. `SecondDetail` updates with the second's real holder.
5. No control is reachable only by mouse; no control is reachable twice.
6. Repeat at 375 px width and with VoiceOver: range announces "second 42 of 273, pressed by vitalik.eth".

---

## 5. Migration

- `/press/[tokenId]`, `/pressed/[tokenId]`, `/press`, `/no-sleeve` keep their paths, params and behaviour. Only their header block is swapped for `SiteHeader` (M5). No route file is renamed or moved, so every deep link and the Farcaster miniapp entry URL keep working.
- The drawer keeps opening `PressFlow` with the same `tokenId` contract; the `/press/[tokenId]` route stays the canonical link target for the unsealed-audio recovery path.
- Ship order, each a separately revertable commit: M1 (honest data) → M5 `SiteHeader` → M2 (`Composition`) → M3 (states) → M4 (weight) → M6 (COEP fix, ships before or with M2 since it protects the press flow).
- No feature flag. `Composition` replaces `GalleryPlayer` in `GallerySection` in one commit; `GalleryPlayer.tsx` is deleted in that same commit once the criteria below hold. Rollback is `git revert`, not a toggle.
- Preview deploy on the Vercel branch URL is the staging surface; mainnet `sleeves.catra.fyi` promotes only after the checklist passes.

## 6. Cutover criteria (delete `GalleryPlayer.tsx` when all are true)

1. `Composition` plays the assembled 4′33″ from the real contract on Base mainnet, with the same scheduler behaviour (10 s lookahead, no double-scheduling, clean stop).
2. The keyboard walkthrough in §4 passes end to end on desktop and at 375 px.
3. `grep -r MOCK_` and `grep -rE "text-xs|text-sm|text-\[9px\]|text-\[10px\]" app components` are both empty.
4. Every informational text node measures ≥ 4.5:1 against `#111111`.
5. `next build` reports `/` first load JS < 500 kB, and devtools shows no `getAudio` metadata reads and no animated GIF.
6. With the RPC blocked, the surface says "can't reach Base right now" and retry recovers.
7. Press flow verified end to end on Sepolia after the COEP fix, including the unsealed-audio recovery path.
8. Nothing imports `GalleryPlayer` (`grep -rn GalleryPlayer app components` empty apart from the file itself).

## 7. Guards

- No segment map, no per-second DOM node array in the new tree. The waveform is one canvas; if it grows click handlers, the port failed.
- No `?enableNewPlayer` flag, no parallel gallery component after cutover.
- Every change traces to one of the five principles above; anything that traces only to taste does not ship in this pass.

---

# What shipped (execution log)

Executed 2026-08-27. Deviations from the plan above, with the evidence that forced each one.

## Changed from plan

1. **No event-log read layer, no `NEXT_PUBLIC_DEPLOY_BLOCK`.** Base's public RPC caps `eth_getLogs` at a 10,000-block range (verified against `mainnet.base.org` and `sepolia.base.org`), which is about 5.5 hours of chain. Scanning from a deploy block would cost hundreds of requests per load. Instead `getAudio` was removed from metadata entirely: `isPressed`/`pressedBy`/`pressedAt` stay on multicall, and audio bytes are fetched only when a second is played (`Composition.fetchBuffer`).
2. **`hasAudio` deleted from `PressedSecond`.** With no length getter on the contract, the only honest source was the payload itself. The gallery no longer claims anything about audio; the holder's own unsealed-audio case is still covered by `useUnsealedToken` and the press flow.
3. **`holderAddress` is now `string | null`.** Public RPCs rate-limit; the old code substituted `0x0000…0000` for a failed holder read and rendered it as a real presser. Pressed-ness and holder identity are now separate facts: the second still shows as pressed, the detail says "pressed. base didn't return who pressed it.", and no marker is drawn.
4. **COOP/COEP headers removed instead of self-hosting ffmpeg.** unpkg does serve `cross-origin-resource-policy: cross-origin`, so `require-corp` was not breaking audio. But `@ffmpeg/core@0.12.9` is the single-threaded build and needs no SharedArrayBuffer, while `Cross-Origin-Opener-Policy: same-origin` breaks the Coinbase Wallet popup (SDK logs this explicitly). Verified in the browser: `generateAudio` returns the same 4030 bytes with the headers and without them, `sab=false`.
5. **SoundCloud reference applied** (added after the plan, at the user's request): waveform-first player, 56px round accent play button, played region in accent, holder markers under the track, time labels at both ends. A new `accent: #ff5500` token in `tailwind.config.ts` carries one meaning only — sound that exists and is playing.
6. **Bounded RPC transport.** `http(rpc, { timeout: 6_000, retryCount: 1 })` for Base, `timeout: 5_000, retryCount: 0` for the ENS mainnet client. A dead RPC used to sit behind "reading Base…" for 40+ seconds.
7. **`networkMode: "always"` + `retry: 1`** on the gallery query and as a QueryClient default: a paused query (React Query pauses when the browser reports offline) leaves the surface stuck in its loading state instead of failing honestly.

## Files

| File | Change |
| --- | --- |
| `components/Composition.tsx` (new) | Replaces `GalleryPlayer`. One `<input type="range">` over a canvas waveform, real pause, holder markers, detail card. |
| `components/GalleryPlayer.tsx` | Deleted. |
| `components/GallerySection.tsx` | `MOCK_PRESSED` deleted; loading / error / empty / success authored; one status readout; one holder-action slot. |
| `components/SiteHeader.tsx` (new) | Shared header, adopted by `/`, `/press`, `/press/[tokenId]`, `/pressed/[tokenId]`, `/no-sleeve`. |
| `components/PressDrawer.tsx` | `role="dialog"`, `aria-modal`, Escape, focus trap, focus return. |
| `components/Providers.tsx` | QueryClient defaults: `networkMode: "always"`, `retry: 1`. |
| `lib/sleeves.ts` | No `getAudio` in metadata; nullable holder; bounded transports. |
| `lib/wagmi.ts` | `getDefaultConfig` → explicit `injected` + `coinbaseWallet`. WalletConnect dropped (−35 kB). |
| `app/page.tsx` | `SiteHeader`, `next/dynamic` PressDrawer, copy. |
| `app/globals.css` | Global `:focus-visible` ring, `prefers-reduced-motion` block. |
| `next.config.mjs` | COOP/COEP headers removed. |
| `app/press/[tokenId]/PressFlow.tsx` | `toUserError` maps wallet/RPC/revert failures to sentences; step labels and copy rewritten; type scale. |
| `public/sleeve-art.png` (new) | Static first frame, 31 KB, replaces the 326 KB looping GIF (deleted). |

## Verified

| Check | Result |
| --- | --- |
| First load JS on `/` | 514 kB → **473 kB** (`next build`) |
| Mock data | `grep -r MOCK_` empty; live prod HTML still contains `0x1234…`, `0x9999…`, `0xaaaa…` |
| Error: unreachable RPC | Points at a dead host → "base didn't answer" + working retry, within ~13 s |
| Error: reverting contract | Sepolia `totalSupply` reverts → "the read failed" + retry |
| Success: real mainnet data | "11 of 273 seconds pressed", real waveform, no fabricated holders |
| Holder read rate-limited | Second shows pressed, detail says base didn't return the holder, no marker |
| Keyboard seek | Tab reaches range; `→` +1 s, `PageUp` +27 s, `Home`/`End` jump; `aria-valuetext` and detail follow |
| Focus ring | Visible on range, buttons, links (global `:focus-visible`) |
| Drawer | Focus moves to close button, Escape closes, focus returns to trigger |
| Audio pipeline | `generateAudio` → 4030 bytes with and without COOP/COEP |
| Type scale | `grep -rE "text-xs|text-sm|text-\[9px\]|text-\[10px\]"` in `app/` and `components/` → empty |
| Em dashes in UI copy | none |

Not verified by machine: Enter/Space activation of the play button. The harness delivers keydown events without generating the browser's default activation, so this needs one human check on a native `<button>`; nothing in the code prevents it.

## Open items for the user

- **Production RPC.** `mainnet.base.org` rate-limits the holder multicall, so holders show as unknown. Set `NEXT_PUBLIC_RPC_URL` to a dedicated provider before shipping.
- **Wallet set.** WalletConnect is gone. Browser-extension wallets, Coinbase Wallet, and the Farcaster miniapp provider still work; mobile wallets that relied on the WalletConnect QR do not.
- **Accent colour.** `#ff5500` is a new brand token, added for the SoundCloud direction.
- **`/pressed/[tokenId]`** is still 542 kB first load and keeps its own header adoption only; its reveal sequence was preserved untouched.

---

# Aesthetic pass — record store direction (2026-08-27)

Run after the Rams rebuild, from `/plan-design-review` with the brief: make it 10x cooler,
surface the minted artwork, minimalist record store with innovation, use overlooked design
features, stay UX friendly.

## Ratings before this pass

| Dimension | Before | After | What moved it |
| --- | --- | --- | --- |
| Aesthetic distinctiveness | 3/10 | 9/10 | Cream paper accent sampled from the sleeves replaces the SoundCloud orange; grain, hairlines, letterspaced signage |
| Use of own artwork | 1/10 | 10/10 | Real per-sleeve art at four points in the journey |
| Emotional arc | 3/10 | 8/10 | Silence plate → now showing → your sleeve before the press → your sleeve after it |
| Material / texture | 2/10 | 9/10 | SVG turbulence grain, screen-blended wrap sheen, hatched silence |
| Typography as identity | 4/10 | 8/10 | 88px zero-padded numerals, slashed zero, 0.28em signage tracking |
| UX integrity | 8/10 | 8/10 | One seek control, one readout, honest states all preserved |

## Decisions taken

- **D2 — direction: A+C hybrid.** Listening station above (sleeve on display, big numeral,
  waveform), rack of sleeves below. B (spinning platter) rejected: a circular player invites
  circular seeking and fights the single-slider keyboard model.
- **D3 — numbering: the sleeve's own trait wins for label AND position.** Sleeves token id 2
  carries `Sleeve #238` with trait `Second: 238`. The app now places audio at the trait's second
  and labels every surface with it. The ERC721 token id survives only as the key for reading that
  sleeve's audio from the Sound contract.

## What shipped

| File | Change |
| --- | --- |
| `lib/sleeve-index.json` + `scripts/build-sleeve-index.mjs` | 83 minted sleeves indexed: token id → second, image, name. Metadata is immutable, so it is checked in rather than fetched 273 times at runtime. Rebuild after a mint. |
| `lib/sleeveIndex.ts` | `secondOf`, `sleeveMeta`, `sleeveLabel`. |
| `lib/sleeves.ts` | `PressedSecond` gains `second` and `image`; both null for tokens minted after the last index build. |
| `components/SleeveImage.tsx` (new) | Shrink-wrap sheen as a screen-blended gradient, hatched empty plate, `next/image` downscaling from the 2048px originals. |
| `components/Rack.tsx` (new, replaces `PressList`) | The crate: every pressed sleeve as artwork with its timestamp on a paper chip, holder link, copy button, plus a toggle for the 262 silent seconds as hatched tiles. |
| `components/Composition.tsx` | Position keyed by the sleeve's second, not token id. Sleeve on display beside an 88px numeral. Cream waveform. |
| `app/globals.css` | Paper grain (inline SVG turbulence, `mix-blend-mode: overlay`), scroll-driven rack reveal behind `@supports (animation-timeline: view())`, both motion-gated. |
| `tailwind.config.ts` | `accent`/`paper` = `#e8dfcd`, sampled from the sleeve stock. |
| `app/press/[tokenId]/PressFlow.tsx` | Your sleeve, at size, before you press it. Labels switched to sleeve numbers. |
| `app/pressed/[tokenId]/PressedView.tsx` | Artwork on both reveal screens; reveal sequence itself untouched. |
| `app/press/page.tsx` | Picker is sleeves now, not a number grid. |
| `next.config.mjs` | `remotePatterns` for arweave.net and gateway.irys.xyz. |

## Overlooked techniques used, and why each is safe

- **SVG `feTurbulence` grain as a data URI** — one paint, no request, no layout. Kills the
  dashboard flatness that made #111 feel generic.
- **`animation-timeline: view()`** — scroll-driven reveal with no JS, no IntersectionObserver,
  no library. Behind `@supports` and `prefers-reduced-motion: no-preference`.
- **`mix-blend-mode: screen` sheen** — plastic wrap that adapts to whatever art is under it,
  instead of a per-image overlay asset.
- **`font-variant-numeric: slashed-zero tabular-nums`** — the piece is made of numbers; zeros
  now read as zeros and columns stop shifting.
- **Zero-padded 3-digit numerals at 88px** — turns the position into the page's largest object.

## Verified

- Trait-based numbering renders across home, rack, press, pressed, picker: token 17 shows as
  sleeve #37 and plays at 0:36.
- Real mainnet data: 11 pressed, artwork loaded from Arweave and Irys through `next/image`.
- Desktop 1180px, tablet 768, mobile 375: no horizontal scroll, rack reflows 4→3→2 columns.
- Production build: `/` = 483 kB first load (budget was 500 kB).
- Keyboard seek, focus rings, honest error/loading states from the previous pass all still hold.

## Open

- **Playback order changed for already-pressed sounds** (D3). Anything published that named a
  position by token id is now stale.
- Image weight: each optimized sleeve is ~90-390 kB depending on width; the rack lazy-loads, but
  a fully pressed 273-sleeve rack should get a smaller `sizes` step or a thumbnail CDN.
- `scripts/build-sleeve-index.mjs` must be re-run after each new mint, or new sleeves fall back
  to token-id labels.

## GSTACK REVIEW REPORT

| Run | Status | Findings |
| --- | --- | --- |
| /plan-design-review (aesthetic pass) | complete | 6 dimensions rated, 2 decisions taken (D2 direction, D3 numbering), 1 correctness bug found and fixed |
| Design outside voices | skipped | `codex` not installed on this machine; no OPENAI_API_KEY, so gstack designer mockups fell back to hand-built HTML sketches |
| Visual mockups | complete | 3 directions built and reviewed against real sleeve artwork; A+C hybrid selected |
| Implementation | complete | Build passes, `/` at 483 kB, verified at 375 / 768 / 1180 px against mainnet data |

VERDICT: SHIPPED — aesthetic direction implemented and verified in the running app, not left as a plan.

CODEX: unavailable (binary not installed).
CROSS-MODEL: not run.

**UNRESOLVED DECISIONS:**
- Playback order now follows each sleeve's `Second` trait instead of its ERC721 token id (D3). Any public post, cast, or doc that named a second by token id is stale and needs correcting by catra.
