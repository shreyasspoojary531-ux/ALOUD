# ALOUD — PRODUCTION READINESS AUDIT (READ-ONLY)

**Date:** 2026-09-09
**Scope:** Full codebase (87 project files, all `app/`, `components/`, `lib/`, `styles/`, `public/`)
**Method:** Every source file read in full; every dead-code claim grep-verified; production build executed (`next build`).
**Constraint:** Audit pass — no code was modified. This file is the only artifact created.

**Build status:** `next build` passes, 0 errors. One build warning (see §7). This report contains no fix code.

---

## 1. DEAD / UNUSED CODE

### 1.1 — HIGH — Adaptive Dwell feature is entirely non-functional (dead engine)
- **Files:** `lib/adaptiveDwell.js` (line 46), all callers
- **Evidence:** `trackDwellSignal()` is the *only* writer of `aloud_dwell_metrics`, and grep across the whole repo shows **zero call sites** — only its definition:

  ```
  lib/adaptiveDwell.js:46: export function trackDwellSignal(isCorrection = false) {
  ```

  Meanwhile `adaptDwellBetweenSessions()` (SettingsContext.jsx line 79) bails out when metrics are empty:

  ```js
  const rawMetrics = localStorage.getItem(STORAGE_KEY_METRICS);
  if (!rawMetrics) return currentDwell;
  ```

- **Why it matters:** The Settings page ships a live "Adaptive Scan Speed" toggle (`app/settings/page.jsx`, Card 4) that can never do anything. A user enables it, gets zero adaptation, and the Settings UI even displays "adapted between sessions" — a false claim in an accessibility product. This is a real product bug masquerading as dead code.

### 1.2 — MEDIUM — Dead component files (grep-verified, zero imports)
- `components/shaders/ShaderDebugBar.jsx` — only match in repo is its own definition (line 34). A 300-line debug UI with hardcoded emerald palette ships in the bundle graph.
- `components/shaders/StructureFlowCollection.jsx` + `components/shaders/DotMatrixBackground.jsx` + `components/shaders/dotMatrixShaders.js` — `StructureFlowCollection` is imported nowhere; `DotMatrixBackground` only by the dead `StructureFlowCollection`. Three files of WebGL code never rendered.
- `components/landing/TextEffects.jsx` — `StaggeredHeading` (line 8) and `BlurHighlightText` (line 49) imported nowhere.

### 1.3 — MEDIUM — Dead CSS classes (grep-verified no JSX usage)
`styles/globals.css` defines classes with zero consumers:

| Line | Class |
|---|---|
| 33 | `.app-background-shader` (AppBackground uses inline styles instead) |
| 413 | `.intro-icon` (setup uses `cal-icon`) |
| 1292 | `.camera-off` |
| 1312 | `.back-card` |
| 1567 | `.settings-page-title` |
| 1695/1710 | `.telegram-link`, `.telegram-card` |
| 2456 | `.dots` |
| 3253 | `.empty-icon` (page uses `empty-icon-wrap`) |
| 3711 | `.custom-phrases-open-btn` |
| 1617 | `.settings-card.scannable-active-card` |

### 1.4 — LOW — Unused imports & dead refs
- `app/page.jsx` line 5: `import Button from "../components/shared/Button";` — JSX only uses `TactileButton`.
- `app/error.jsx` line 3 and `app/not-found.jsx` line 3: `import Link from "next/link";` — never used in either.
- `app/error.jsx` lines 61–63: `const blink = useRef(null); blink.current = (options) => ...` — assigned every render, never read (`onBlink` calls `select` directly). Same dead pattern in `not-found.jsx` lines 79–81.
- `public/mainicon.png` (92 KB) — referenced nowhere in the repo.

### 1.5 — LOW — Dead handler branch evidence of removed rows
- `components/keyboard/Keyboard.jsx` lines 150–153: `if ([".", ",", "?"].includes(key.label))` — **no such keys exist in any row** (letters, space, back, cursor nav, suggestions only). Leftover from the removed EDIT/ACTIONS rows.

### 1.6 — MEDIUM — Documentation describes phantom code
- `.agents/MEMORY.md` lists `shared/SettingsModal.jsx` — file does not exist (only `SettingsPopover.jsx`). This is the exact duplicate pattern previously flagged: the duplicate was deleted, the map wasn't updated.
- `README.md`: claims "Gemini 2.5 Flash" (actual: `gemini-3.5-flash-lite`, `lib/gemini.js` line 3), claims a "4s minimum-interval rate limit" (actual: 1.5 s, `app/api/suggest/route.js` line 10), claims `{ suggestions: [...] }` response shape (actual: `{ sentences }`), documents `aloud_voice`/`aloud_history` keys (actual: `aloud_voice_name`/`aloud_analytics_events`).

### 1.7 — LOW — Near-duplicate code blocks
- `useIsMobile()` copy-pasted verbatim in `Keyboard.jsx` (lines 11–32) and `TopBar.jsx` (lines 15–36).
- `ProfileIcon` defined twice (`app/settings/page.jsx` line 9, `TopBar.jsx` line 57); `EyeIcon` ×3 (`CustomModeSelect`, `BentoGrid`, `GlassCTACard`); `ScanLineIcon`/`Volume2Icon` ×2 (`BentoGrid`, `GlassCTACard`); `HomeIcon` ×2 (`error.jsx`, `not-found.jsx`); `KeyboardIcon` ×2 (`not-found.jsx`, `BentoGrid`).

---

## 2. SECURITY

### 2.1 — CRITICAL — `/api/telegram/get-chat-id` is an unauthenticated caregiver directory
- **File:** `app/api/telegram/get-chat-id/route.js` (entire file)
- **Evidence:** A plain `GET` with no auth, no origin check, no secret:

  ```js
  export async function GET() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    ...
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, ...)
    ...
    const senders = getCachedSenders();
    return NextResponse.json({ ok: true, senders });
  }
  ```

  and `lib/telegram.js` caches **every sender's chat ID, real name, and username**:

  ```js
  cachedSenders.set(idStr, senderInfo); // { chat_id, name, username }
  ```

- **Why it matters:** Anyone on the internet can enumerate every person who ever messaged the bot — full names, usernames, chat IDs — then feed those chat IDs into the also-unauthenticated send-alert route (2.2) to impersonate the patient's app, phish the caregiver ("Emergency! Send money to…"), or spam them. For a vulnerable-population product this is a safety issue, not just a data leak. Additionally `cachedSenders` grows unbounded and is never cleared (server memory retention of third-party PII).

### 2.2 — HIGH — `/api/telegram/send-alert` is an unauthenticated open relay
- **File:** `app/api/telegram/send-alert/route.js` (entire file)
- **Evidence:** Takes arbitrary `chat_id` + `message` from the request body and forwards to Telegram. No auth, no allowlist, no rate limit, no message validation.
- **Why it matters:** The bot token isn't secret, but the route lets anyone use your bot's quota to message *any* chat ID (Telegram rate-limits/bans bots used for spam — your alert pipeline dies for the real patient), and deliver arbitrary content to a caregiver who trusts the bot.

### 2.3 — HIGH — `/api/suggest` rate limit is decorative
- **File:** `app/api/suggest/route.js` lines 7–17
- **Evidence:**

  ```js
  let lastRequestTime = 0;           // module-global, all users share one slot
  if (now - lastRequestTime < 1500) { ...429... }
  ```

  No per-IP keying, no request-body size cap, no concurrency protection. `lastRequestTime` is only set *after* validation (line 24), and resets to 0 on every serverless cold start.
- **Why it matters:** A public endpoint that calls a paid LLM API with a 1.5-second *global* throttle is not abuse protection: one open tab pinging every 1.5s doesn't block an attacker running parallel requests, and `message` length is unbounded (a multi-MB prompt goes straight to Gemini at your cost).

### 2.4 — MEDIUM-HIGH — `/api/telegram/webhook` accepts forged updates
- **File:** `app/api/telegram/webhook/route.js`
- **Evidence:** No `X-Telegram-Bot-Api-Secret-Token` check; any POST is processed and its `from`/`chat` data written into `cachedSenders` — i.e., an attacker can inject fake caregiver entries ("Mom ❤") that appear in the patient's Settings "Select your caregiver" list. Also, registering a real webhook makes Telegram reject `getUpdates` (409), which breaks the Settings "Find caregiver" flow that relies on `getUpdates` — the two ingestion paths are mutually exclusive and nothing enforces one.

### 2.5 — MEDIUM — Gemini API key passed in URL query string
- **File:** `lib/gemini.js` line 43: ``fetch(`${API_URL}?key=${apiKey}`)`` — keys in URLs leak into proxies/access logs. (Key itself is correctly server-only: `process.env.GEMINI_API_KEY` inside a server module, not `NEXT_PUBLIC_*` — ✓ no client exposure found.)

### 2.6 — MEDIUM — No security headers, no next.config at all
- **Evidence:** No `next.config.mjs/js/ts` exists. No CSP, HSTS, X-Frame-Options, or Permissions-Policy. The camera app should at minimum have a Permissions-Policy and frame-ancestors policy.

### 2.7 — LOW — Debug injection hook left in production bundle
- **File:** `components/camera/CameraPill.jsx` lines 48–52:

  ```js
  window.__injectLandmarks = (lm) => { callbacks.current.onFaceLandmarks?.(lm); };
  ```

  Never removed on unmount; any script (or console) can spoof face landmarks → force blink detections.

### 2.8 — PASS with notes
- `dangerouslySetInnerHTML` used exactly once (`app/layout.jsx` line 31) with a static string — safe. No `eval`/`new Function` anywhere.
- No CORS headers configured on API routes → browser default same-origin policy applies; not overly permissive.
- No `parse_mode` on Telegram sends → no markup injection.

---

## 3. ERROR HANDLING & EDGE CASES

### 3.1 — HIGH — Camera hardware disconnect mid-session = silent freeze
- **File:** `components/camera/CameraPill.jsx` tick loop (lines ~221–410)
- **Evidence:** The loop only reacts to `readyState`/`currentTime` going stale by *doing nothing* — no `track.onended`/`oninactive` listener is ever registered on the stream. If the camera is unplugged or the OS revokes access mid-session, `currentTime` stops advancing, the `if` guard simply never passes, and the pill keeps displaying the last status ("Tracking your eyes") forever. The rAF loop keeps running; nothing surfaces an error; `handleRetry` is only rendered when `cameraError` is set, which never happens.
- **Why it matters:** The user's *only* input channel dies silently. The prior audit's "camera permission denied" path is handled; the "camera vanishes while running" path is not.

### 3.2 — MEDIUM — Speech-blocked overlay never auto-dismisses
- **Files:** `lib/speech.js` (onBlocked, lines ~150–160), `components/overlay/SpokenMessageOverlay.jsx` (lines ~105–116)
- **Evidence:** `say()` implements a 1.2 s start-verification timer and calls `callbacks.onBlocked?.(...)` — but the overlay invokes `say(message, { repeat, onEnd })` and never passes `onBlocked` or `onError`. If Brave Shields (or any engine) blocks speech, `onend` never fires → `onDismiss` never runs → the full-screen overlay stays until the user manually selects "I got help". Overlay's own comment says "This will keep playing until you long-blink again" — but nothing is playing.

### 3.3 — MEDIUM — Telegram alert fetch: no timeout, no abort
- **File:** `components/overlay/SpokenMessageOverlay.jsx` lines ~195–230
- **Evidence:** `fetch("/api/telegram/send-alert", ...)` with no `AbortController` and no timeout. On a hung connection the toast shows "Sending alert to {name}…" indefinitely (auto-dismiss only fires on final states). The fetch also isn't cancelled when the overlay unmounts (message changes mid-send → two in-flight alerts possible).

### 3.4 — MEDIUM — localStorage writes inside a state updater
- **File:** `components/shared/SettingsContext.jsx` `addCustomPhrase` (lines ~140–158):

  ```js
  setCustomPhrasesState((prev) => {
    const next = [...prev, newPhrase];
    try { localStorage.setItem("aloud_custom_phrases", JSON.stringify(next)); } catch (e) {}
    return next;
  });
  ```

  Side effect inside the updater runs during render-phase (double-invoked in StrictMode). More importantly, if `localStorage.setItem` throws (quota full / private mode), the phrase **appears saved in the UI but is silently lost on reload** — the empty `catch` swallows it with no user feedback. Same pattern in `deleteCustomPhrase`.

### 3.5 — MEDIUM — BroadcastChannel RELEASE_CAMERA desyncs pill state
- **File:** `components/camera/CameraPill.jsx` lines ~68–80: when a second tab broadcasts `RELEASE_CAMERA`, tracks are stopped but `status` remains "Tracking your eyes", `cameraError` stays null, and detection silently stalls (same failure mode as 3.1).

### 3.6 — LOW — Setup calibration gaps
- `app/setup/page.jsx`: if `openSamples`/`closedSamples` ≤ 5, `completeCalibration` silently navigates to `/home` with default thresholds — no message that calibration failed (lines 116–122).
- `hasTransitionedRef` (line 168) is never reset by `handleStart`; currently unreachable, but it's a loaded gun for any future "retry calibration in place" flow.
- Camera init timeout path is handled (12 s → warning state) ✓.

### 3.7 — PASS
- `/api/suggest` client: 800 ms debounce, `cancelled` flag, `.catch` fallback, honest "AI unavailable" pill ✓.
- `/api/telegram/*` routes: all try/catch'd with typed error responses ✓.
- `useScanner` race protection is genuinely solid: `isPausedRef` + 400 ms lockout + onset-index locking prevents double-select from rapid blinks; interval cleared synchronously at selection ✓.
- All `localStorage` *reads* are try/catch wrapped ✓.
- Dynamic `import("lib/coreVocabulary")` failure (spell/page.jsx line 47) is unhandled — suggestions just never appear; keyboard still works, so Low.

---

## 4. MEMORY LEAKS / PERFORMANCE

### 4.1 — PASS on listener hygiene (all verified)
- `OfflineBanner` online/offline ✓ removed; `TopBar` Escape keydown ✓; `SettingsPopover`/`CustomPhrasesModal` document mousedown/keydown ✓; `useScanner` spacebar ✓; `SplashCursor` all 5 window listeners + rAF ✓; `WarpFieldBackground` resize + ResizeObserver + rAF + `renderer.dispose()` ✓; `SiriWave` rAF + all GL objects deleted ✓; `CameraPill` rAF cancelled, tracks stopped, BroadcastChannel closed ✓; `DotMatrixBackground` (dead file) fully cleaned ✓. No leaked listeners across navigation were found.

### 4.2 — MEDIUM — three.js (~532 KB chunk) for a decorative background
- **Evidence:** Build output: largest chunk `b7be50731efd04d8.js` = 532,061 B; total `.next/static/chunks` = 1.7 MB. `three` is imported only by `components/shaders/warp-field/warpFieldRenderer.js`, used only by `AppBackground` on `/` and `/setup` to render a warp-field wallpaper (with a hue-rotate hack of −140° to recolor its hardcoded emerald palette toward terracotta).
- **Why it matters:** ~30% of the JS payload is wallpaper for a medical app that must load fast on ward/library machines. The Naruto egg adds 5.9 MB of static assets (excluded from SW cache, but shipped).

### 4.3 — LOW — Re-render churn in the scan loop path
- `app/home/page.jsx` rebuilds `items` (and `root`/sub-items) every render without memo → `useScanner`'s `select` useCallback is recreated each render → the spacebar listener effect re-attaches every render. Functionally guarded by the `itemsKey` string (no scanner reset), but it's per-render garbage in a component that re-renders whenever overlay/scan state changes.
- `CameraPill` calls `setStatus`/`setPhase` per frame; React bails out on identical values, so this is fine in practice ✓.
- `KeyRow` hardcodes `useScanner(row.keys, onKey, 1800, ...)` (line 30) and `<ScanRing duration={1800}>` (line 76) — the adaptive `interval` prop passed by Spell page never reaches key-level scanning (see 6.2).

### 4.4 — LOW — Minor teardown residue
- `window.__injectLandmarks` global persists after `CameraPill` unmounts (also security 2.7).
- Setup page's preview `<video>` keeps a dead `srcObject` after CameraPill's cleanup stops the tracks (never nulled by setup page).

---

## 5. ACCESSIBILITY / WCAG

### 5.1 — HIGH — Previously-flagged contrast failures are STILL present (unchanged)
All values computed against the actual backgrounds:

| Location | Foreground / Background | Ratio | WCAG AA (normal text) |
|---|---|---|---|
| `.eyebrow` — globals.css:724 | `#a89b89` on `#f7f1e6` | ≈ 2.4:1 | **FAIL** |
| `.caption` — globals.css:861 | `#a49a8b` on cream | ≈ 2.5:1 | **FAIL** |
| `.row-label` — globals.css:2262 | `#a89b89` on paper | ≈ 2.4:1 | **FAIL** |
| `.message-line` empty state — globals.css:2240 | `#b4a895` on paper | ≈ 2.2:1 | **FAIL** |
| `--muted` `#81776a` (tokens.css:5) used by `.settings-hint`, `.bento-desc`, `.voice-lang`, stat captions… | on `#fffaf1` | ≈ 4.0:1 | **FAIL** for 11–14px text |
| `.key.suggest` — gold-deep on gold wash | ≈ 4.1:1 at 12px bold | **FAIL** (needs 4.5 below 18.7px) |

`.eyebrow` is the heading label of the *primary* Home screen ("WHAT WOULD YOU LIKE TO SAY?"). These are not the same values as tokens; they are hardcoded literals that survived the prior audit.

### 5.2 — HIGH — `--salmon` token does not exist (warning states silently unstyled)
- **Files:** `styles/tokens.css` (defines no `--salmon`) vs. usages at `globals.css` **541, 671, 889** plus inline styles in `app/setup/page.jsx` (`style={{ color: "var(--salmon)" }}`) and `CustomPhrasesModal.jsx` (`accentColor: "var(--salmon)"`, emergency badge `color: var(--salmon)`).
- **Evidence:** e.g. `globals.css:671` `.setup-status-dot` background resolves to nothing → the warning dot renders invisible; `.reticle-corner.searching` stroke falls back to the previous declaration.
- **Why it matters:** Every "warning/denied" affordance on the calibration screen (the screen where users diagnose their own camera problems) is partially broken, and emergency-phrase markers lose their color coding. Same class of bug: `var(--surface)` (globals 1637, 1732) and `var(--r-lg)` (globals 2495 — alert-toast gets `border-radius: 0`) are also undefined.

### 5.3 — MEDIUM — Fonts: nothing to load, docs claim otherwise
- **Evidence:** No `@font-face`, no `next/font`, no font files in `public/`, no Google Fonts links. `--serif: Georgia…`, `--sans: Arial…` (tokens.css) — system stacks that always resolve, so the prior "fonts never loading" bug is structurally gone. **But** `README.md` and `.agents/MEMORY.md` both claim "Instrument Serif"/"Inter" — false documentation of the type system.

### 5.4 — MEDIUM — Scan state is invisible to assistive tech
- The active scan highlight is purely visual (`.active` class). No `aria-live` announcement of which item is highlighted, no `aria-activedescendant` on the keyboard. `CameraPill` has `aria-live="polite"` but announces camera status, not scan position. Fallback inputs do get real buttons with `aria-label`s ✓, so the app is operable, but a screen-reader user gets zero scan feedback.

### 5.5 — LOW
- `CustomModeSelect` listbox: options are non-focusable `<li onClick>`; keyboard nav works only via the container's keydown (partial ARIA pattern).
- Modals (`HelpModal`, `CustomPhrasesModal`, `SettingsPopover`, overlay): `role="dialog"` + labels ✓ but **no focus trap** and `HelpModal` has no Escape handler.
- `ProgressBar` uses a div with `aria-label` instead of `role="progressbar"` + `aria-valuenow`.
- Icon-only controls all carry `aria-label` ✓ (camera toggle, dismiss buttons, close buttons — verified each).

---

## 6. CODE QUALITY / CONSISTENCY

### 6.1 — MEDIUM — Token drift has spread further, not cleaned up
`globals.css` contains dozens of hardcoded hexes outside tokens.css, including gradients that *approximate* tokens: `#df630c`/`#b84600` (button.primary, say-it-full), `#efc9b5` ×3, `#e2dbd0`, `#2a2520`, `#6d655a`, `#524a40`, `#58dd91`, `#e07a5f`, `#ffbe98`, `#962f00`, Tailwind-palette literal greens in the warp field + ShaderDebugBar, plus inline `style={{ fontSize: "12px", padding: "8px 12px" }}` in `app/settings/page.jsx` and a flex-gap inline style in the overlay. The README rule "All colors, fonts, and spacing must come from tokens.css" is broadly unmet.
Additionally `styles/overrides.css` overrides `.home { padding-top: 14vh; }` — killing the token-based `--sp-fluid-home-top` defined in globals; an "overrides" file now carries layout decisions.

### 6.2 — MEDIUM — Inconsistent scan-interval contract
Spell page passes `interval={adaptedDwellDuration}` → Keyboard → **row scanner only**. Key-level scanning is hardcoded `1800` in `KeyRow.jsx` line 30, and `ScanRing duration={1800}` hardcoded at line 76. Meanwhile `--scan-ms: 1800ms` exists as a token but no JS reads it. If adaptive dwell ever works (see 1.1), keys will scan at a different speed than rows.

### 6.3 — LOW-MEDIUM — Inconsistent blinkSelect contract
`CategoryGrid`/`KeyRow` install an object `{ onLongBlink, onBlinkOnset }`; Splash/Setup/Error/NotFound install a bare function. `spell/page.jsx` and `home/page.jsx` carry defensive dual-shape checks (`typeof blink.current === "function" ? ... : blink.current.onLongBlink`) — evidence the contract diverged and was patched around rather than unified.

### 6.4 — LOW — Icon system still mixed (prior issue, unresolved)
Icon.jsx SVG set is used for category cards and keys, but raw unicode persists across production UI: `◯ ⚙ ✕` (TopBar drawer/help/settings), `➕` (settings card), `🔍 🔔` (settings buttons), `⤢ –` (CameraPill toggle), `⚠` (error pages), `◉ ◉̸ ⌗ 🔊` (HelpModal + setup steps), `↺` (reset dwell), `✓ +` (overlay buttons).

### 6.5 — LOW — Prop drilling / state shape
`message/cursorPos/setCursorPos/speak/blinkSelect/keyboardRef` are drilled Spell → Keyboard → KeyRow closures; three overlapping pause systems exist (`EyeControlContext.isPaused`, `useScanner` local `isPaused`, CameraPill status pauses). Workable, but every new feature has been bolting onto this spine.

---

## 7. PRODUCTION CONFIG

### 7.1 — HIGH — Service Worker precache is a no-op (silent total failure)
- **File:** `public/sw.js` lines 2–22
- **Evidence:** `APP_SHELL_URLS` includes `"/styles/globals.css"` and `"/styles/tokens.css"`. Those URLs **do not exist in production** — CSS is compiled into `/_next/static/` chunks and `public/` contains no `styles/` folder (verified via glob). `cache.addAll(...)` is all-or-nothing: one 404 rejects the whole batch, and the rejection is swallowed:

  ```js
  await cache.addAll(APP_SHELL_URLS).catch(() => {});
  ```

- **Why it matters:** **Nothing gets precached.** The "works offline" promise for a bedside AAC app depends entirely on runtime caching of whatever the user happened to load while online. First-visit-offline → SW fallback only catches `/offline.html` if it was previously runtime-cached (it wasn't). Also: WASM/models are cached forever under `aloud-pwa-v3` while the WASM URL pins `@mediapipe/tasks-vision@latest` (`lib/mediapipeLoader.js` line 7) — a package bump without a manual `CACHE_NAME` bump serves stale WASM against new JS.

### 7.2 — MEDIUM — Env vars undocumented
- No `.env.example` exists. `README.md` documents only `GEMINI_API_KEY`; `TELEGRAM_BOT_TOKEN` (required by all three Telegram routes, which 500 without it) appears nowhere. The bot handle `@Alouddd_bot` is hardcoded in `app/settings/page.jsx` (lines 157–166) — a deploy-specific value baked into source.

### 7.3 — MEDIUM — Build warning: wrong workspace root inference
```
⚠ Warning: Next.js inferred your workspace root... selected /home/shreyas_95/package-lock.json
Detected additional lockfiles: /home/shreyas_95/Documents/PROJECTS/ALOUD/package-lock.json
```
Stray `package-lock.json` in `$HOME` makes Turbopack guess the wrong root. No `next.config` exists to set `turbopack.root` (or add headers — see 2.6). Aside from this, the build is clean: 0 TS errors, 15 pages generated.

### 7.4 — MEDIUM — console.log shipping to production
- `app/setup/page.jsx` lines **123, 200, 203**: `[PerfBenchmark]`, `[Setup] 1.5s stable eye tracking achieved!...`, `[Setup] Step 1 complete -> setStep(2)` — debug logs left in the calibration flow. (console.warn/error elsewhere is acceptable.)

### 7.5 — LOW — Two competing manifests
`app/manifest.js` (Next-generated `/manifest.webmanifest`) **and** `public/manifest.json` exist with identical content; layout.jsx links `/manifest.json` manually while Next also injects its own — duplicate manifest references in HTML.

### 7.6 — LOW — SW `/api/suggest` fallback shape mismatch
`sw.js` offline fallback returns `{ suggestions: [] }`; the client reads `data.sentences`. Harmless today (client treats it as "no sentences"), but another doc/impl drift.

---

## 8. SCAN / BLINK ARCHITECTURE INTEGRITY

### 8.1 — PASS — Full fresh pass over every scanner instance
Traced all nine `useScanner` consumers; ref-arrays complete and ordered:

| Screen | Items | Verdict |
|---|---|---|
| Home root | 5 cards (4 + wide Spell) ↔ rendered 1:1 | ✓ |
| Home sub-grids | builtin + custom + ("Custom Phrases" in Answers) + Back | ✓ indexes match `choose()` label routing |
| Keyboard rows | suggest (desktop 1 / mobile 1–2) + AI rows (0–1 desktop / up to 3 mobile) + letter rows + cursorRow; `itemsKey` unique per label | ✓ |
| KeyRow keys | rendered from same `row.keys` array; `opened` gating correct; blinkSelect handler only installed for the active row, and the opened row stays `active` while the keyboard-level scanner is disabled | ✓ (re-traced the suspicious case — no stale handler) |
| SpokenMessageOverlay | spell→2 items ↔ 2 buttons; home→1 item ↔ 1 button; `handleAction` index guards | ✓ |
| Error / NotFound | 2 actions ↔ 2 buttons | ✓ (dead `blink` refs only, 1.4) |
| Setup | 1 item ("Start"/"Continue") | ✓ |

Onset-capture, 400 ms lockout, and `itemsKey` reset all behave correctly; no double-select window found on rapid blink transitions.

### 8.2 — PASS with residue — Removed features
- **Eyebrow standalone mode:** correctly gone from `MODES` (CustomModeSelect), with an intentional localStorage migration shim (`EyeControlContext.jsx` lines 22–26). `useEyebrowSelect.js` itself is NOT dead — it powers the Spell-screen shortcut. **Residue:** `SettingsContext.eyebrowShortcut` state + `aloud_eyebrow_shortcut` key (lines 15–16, 54–56, 97–99) are now consumed by *nothing* — the settings UI for it was deleted. Dead state from the removal.
- **Up/down D-pad:** gone — `cursorRow` contains only home/left/backspace/right/back. Only residue is the dead punctuation branch (1.5).
- **EDIT/ACTIONS rows:** gone — no labels or handlers remain anywhere.

### 8.3 — LOW — Adaptive interval only reaches row level (see 6.2) — a latent integrity gap between row/key pacing.

---

# PRODUCTION-READINESS VERDICT

## MUST fix before shipping
1. **2.1 — Lock down `/api/telegram/get-chat-id`** (CRITICAL): unauthenticated enumeration of caregiver identities is exploitable today by anyone who finds the URL, and it chains into 2.2.
2. **2.2 — Lock down `/api/telegram/send-alert`** (HIGH): open relay; Telegram will throttle/ban the bot and your actual alert pipeline with it.
3. **2.3 — Real rate limiting + payload cap on `/api/suggest`** (HIGH): current guard is one global timestamp; a public paid-API endpoint needs per-IP limits and a message length cap.
4. **5.2 — Define `--salmon` (and `--surface`, `--r-lg`)** (HIGH): warning/denied affordances on the calibration screen currently render with no color; this is a functional regression, not a style nit.
5. **7.1 — Fix SW precache** (HIGH): `addAll` fails wholesale because two precache URLs don't exist → the offline guarantee for an offline-first AAC app is currently an illusion.
6. **1.1 — Adaptive dwell is a no-op** (HIGH): shipped toggle does nothing; either wire `trackDwellSignal` or hide the setting before claiming it in Settings.
7. **5.1 — The flagged contrast failures are still unfixed** (HIGH): `#a89b89`/`#a49a8b`/`#b4a895`/`--muted`-at-small-sizes fail AA on your primary screens.
8. **3.1 — Camera-disconnect mid-session** (HIGH): the sole input channel can die with zero feedback and no recovery path.

## Should fix before or immediately after launch
- 2.4 webhook secret + webhook-vs-getUpdates conflict; 2.5 key-in-URL; 2.6 add `next.config` with security headers.
- 3.2 overlay never auto-dismisses when speech is blocked; 3.3 alert fetch timeout/abort; 3.4 quota-failure feedback on custom phrases.
- 7.2 `.env.example` + document `TELEGRAM_BOT_TOKEN`; 7.3 fix lockfile/root warning; 7.4 remove the 3 console.logs.
- 4.2 evaluate whether three.js wallpaper justifies ~30% of the bundle on `/` and `/setup`.

## Can reasonably wait (post-launch hygiene)
- All dead files/CSS/imports (1.2–1.6), doc drift (1.6, 5.3), icon/scan-interval/blink-contract inconsistencies (6.2–6.4), focus traps & aria-live scan announcements (5.4–5.5), manifest duplication (7.5), Naruto egg & `mainicon.png` (1.4, 4.2).

## Bottom line
The scan/blink core and camera lifecycle are in genuinely good shape — the earlier refactors landed clean. What blocks production is almost entirely the server perimeter (two open Telegram endpoints, a token-rate-limit on a paid API), a handful of undefined design tokens with real visual consequences, a silently-failing offline cache, and an accessibility layer whose previously-reported contrast failures were never actually corrected.
