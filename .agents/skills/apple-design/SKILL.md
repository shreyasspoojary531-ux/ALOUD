# Aloud — Agent Instructions

Aloud is an eye-controlled AAC (augmentative communication) app. People who can only
move their eyes use it to build sentences and have them spoken aloud. Every decision
should be filtered through: **does this make it easier for someone with no fine motor
control and no time to fumble through menus?**

Read this file fully before writing any code. Follow it every session, not just the first.

---

## Tech stack — do not deviate without asking

- React 19
- Next.js (App Router)
- Plain CSS with CSS variables (design tokens) — no Tailwind, no CSS-in-JS, no UI kits
  (MUI, shadcn, etc.) unless explicitly asked
- `@mediapipe/tasks-vision` for eye/blink tracking
- Web Speech API for text-to-speech (built into the browser, no package needed)
- Gemini Flash-Lite API for word suggestions, called only from a server route —
  never from the client
- Do not add new npm packages without asking first, even small utility ones. If you
  think one is needed, name it and explain why before installing.

---

## Design standard — read this twice

Do not produce generic AI-template design. No default "cream background + terracotta
accent + serif headline + rounded card grid with icon-on-top" treatment unless it is
genuinely the best-considered choice for this specific screen — and if you use it,
say why, don't default into it silently.

Think like a senior product designer who specializes in accessibility tools, not like
a template generator. That means:

- Every color, spacing value, and font must come from the design tokens file
  (see File Structure below) — never hardcode a hex code or px value inline.
- Justify layout decisions in terms of the actual user: someone scanning with their
  eyes, under time pressure, who cannot afford visual clutter or ambiguity.
- Large, unambiguous touch/scan targets. No decorative elements that could be
  mistaken for functional ones.
- One clear focal point per screen. If you're tempted to add a badge, gradient,
  shadow-on-shadow, or icon just to fill space — don't. Cut it.
- Motion should communicate state (e.g., the scan ring showing dwell time), never
  just decorate. No animation for its own sake.
- Before finishing a screen, review it against this checklist: would this be
  mistaken for a generic template if someone saw it out of context? If yes, revise.

Confirmed palette and type (put these in `styles/tokens.css`, don't invent
alternatives):
- Background: warm cream with a soft radial glow centered behind content
- Primary accent: burnt orange/terracotta — primary buttons, highlight rings, the
  logo's dot
- Category tint set: soft rose (deeper rose icon), soft gold/mustard, soft sage
  green, soft slate blue — used for card icon backgrounds, each with a matching
  deeper tone for its icon and its selected-ring color
- Alert tone: warm red/salmon, reserved for urgent states (e.g. the spoken-message
  overlay for an urgent message, the "call for help" key) — never used decoratively
- Type: an elegant serif for headlines and large spoken-message text (matches the
  "Aloud." wordmark), a clean sans-serif for buttons/labels/body, and small-caps
  letter-spaced sans for eyebrow labels (e.g. "WHAT WOULD YOU LIKE TO SAY?")
- Selected/highlighted state = a colored ring border matching the element's own
  tint, not just a background swap

---

## Input rule — always dual, never either/or

Every selectable element in the app must respond to a real mouse/touch click AND
the long-blink scan-select signal AND the Spacebar (testing fallback) at all times,
simultaneously — never a mode you switch between. All three call the exact same
`select()` function on the exact same item. Don't gate click behind "eye control
off" or treat it as a fallback-only path; a sighted companion or the user themself
should be able to just tap when that's easier, with zero difference in outcome from
blinking.

## Reference screens — build to match, don't reinterpret

These screens are confirmed from actual design references. Match their structure
and tone; don't substitute a generic layout for any of them.

1. **Splash** — centered "Aloud." wordmark with an orange dot, italic tagline below,
   single orange pill button "Begin with eye control."
2. **Calibration flow** — sequence of full-screen centered steps (icon, headline,
   one line of instruction, thin filling progress bar): intro with Start/Skip for
   now, "Starting camera…", "Keep your eyes open", "Get ready…", "Close your eyes
   now" — then continue to Home. Skippable, not a hard requirement.
3. **Home** — eyebrow label "WHAT WOULD YOU LIKE TO SAY?" above a card grid (I feel,
   I need, People, Answers as 2x2, full-width "Spell it out" card below). Selecting
   a category shows a similar grid of sub-options with a Back option. Bottom caption:
   "The highlight moves on its own · take a long blink to select," with a small
   pulsing dot.
4. **Spell it out** — top bar (Home back link, centered title, "Normal" speed pill),
   eyebrow "YOUR MESSAGE" with an italic placeholder/live message line, then labeled
   rows (suggestions, A–I, J–R, S–Z+space, edit, actions) each ending in a "back"
   cell. Row-level scan first (whole row outlined), select a row to scan its keys.
   The "call for help" action gets distinct alert styling, not a neutral key. Bottom
   caption: "A row is highlighting — long-blink to open it."
5. **Spoken-message overlay** — full-screen takeover when a message is spoken: small
   pulsing dots row at top, the message in large bold centered text, a dark pill "✓
   I got help" button below, caption explaining it repeats until dismissed. Background
   shifts tone with urgency — alert/urgent messages get a warmer red/salmon
   background, routine messages stay on the normal cream background. Dismissing
   returns to Home.

## Code efficiency

Write the shortest correct implementation. If something can be done cleanly in
10 lines, do not write 20. Prefer:
- Composing small, reusable functions/hooks over duplicating logic
- Deleting dead code and unused props immediately, not leaving them "just in case"
- No premature abstraction — don't build a generic system for something used once

But efficiency never trumps clarity. If cutting lines makes the logic harder to
follow, keep the clearer version. Explain non-obvious code with a single-line
comment instead of naming variables `x1`, `x2`, `tmp`, etc.

---

## External design references

I will add other reference files over time (e.g. an Apple design/HIG doc). When that
happens:
- Apple's guidelines inform *interaction patterns and polish* (motion feel, spacing
  rhythm, how a control communicates its state, transition timing) — not the literal
  Apple visual identity. Do not pull in SF Pro, Apple's blue, or iOS-style chrome.
  Aloud's own tokens in `styles/tokens.css` remain the source of truth for color and
  type.
- If a new reference file conflicts with something in this file, stop and ask which
  one wins rather than guessing or blending both.
- Never let a new reference doc silently change existing tokens or components. Treat
  it as additive guidance until I confirm a change.

## Accessibility beyond visual design

The primary user often has a switch/eye-tracking-only input and may have low vision.
Secondary users (caregivers) may use a screen reader on the caregiver view.
- Every scannable element needs a real accessible name (not just a visual label) —
  screen readers should announce the same thing sighted users see.
- Respect `prefers-reduced-motion`: the scan ring must still communicate dwell time
  without relying on animation the user has asked to reduce.
- Never rely on color alone to show state (selected/active/error). Pair color with
  shape, icon, or text.
- Minimum contrast: 4.5:1 for text, 3:1 for large text and UI boundaries. Check this
  against the actual token values, not by eye.

## State & data flow

- Keep state as local as possible. Only lift state up (or into context) when two+
  components genuinely need it.
- The in-progress message being composed is the one piece of state that's allowed to
  live at the top of the app (`app/page.jsx` or a small context) — everything else
  should be derived from or scoped under it, not duplicated.
- No global state library (Redux/Zustand/etc.) unless I explicitly ask — React state
  and context are enough at this size.

## Error & edge-case handling

Always handle these explicitly, don't let them fail silently:
- Camera permission denied or no camera available → fall back to Spacebar/click
  selection, show a clear inline message, never leave the user stuck.
- No face detected for a few seconds → show a gentle on-screen indicator, don't spam
  errors.
- Gemini suggestion call fails or times out → keyboard must still work with zero
  suggestions shown; never block typing on the AI call.
- Speech synthesis unavailable (some browsers/first-load-without-tap) → show the
  message as text so it's not silently lost.

## Environment & secrets

- API keys only ever live in `.env.local` / server environment variables, referenced
  from server-side files (e.g. `lib/gemini.js`, `app/api/suggest/route.js`).
- Never write a key directly into a file, commit, or client component. If you need a
  new env variable, tell me its name and where to set it — don't invent one silently.

## Responsive breakpoints

There is no sidebar in this app, on any screen, at any width — every screen uses a
simple top bar (logo left, control pills right) with centered content below it. Only
the content's max-width and padding change with viewport size.
- Desktop: ≥900px — content centered, generous whitespace around it
- Mobile: <900px — same top bar and centered content, just narrower
- Camera preview is a floating rounded pill, bottom-right, on every screen, at every
  width. It never sits inside a fixed panel and must never overlap an interactive
  element — if a screen's layout would let that happen, fix the layout, don't just
  let it float on top.
Don't add a tablet-specific breakpoint unless a real layout problem shows up at that
width.

## Git & commits

- Small, working commits — one per feature/part, not one giant commit at the end.
- Commit message states what changed and why in one line, plain language
  (e.g. "Add row-level scanning to spell keyboard", not "update files").
- Never commit `.env.local` or any file containing a key.

## File structure

Keep this structure. Ask before adding new top-level folders.

```
app/
  page.jsx                  → Splash screen
  setup/page.jsx             → Calibration flow
  home/page.jsx               → Home screen + category sub-grids
  spell/page.jsx                → Spell-it-out keyboard screen
  api/
    suggest/route.js           → Gemini call, server-side only

components/
  scanner/
    useScanner.js                → core scan-cycle + select logic (screen-agnostic)
    ScanRing.jsx                  → the visual dwell-time indicator
  keyboard/
    Keyboard.jsx
    KeyRow.jsx
  camera/
    CameraPill.jsx                 → floating webcam pill + blink detection wiring
  home/
    CategoryGrid.jsx
    CategoryCard.jsx
  overlay/
    SpokenMessageOverlay.jsx        → full-screen "message being spoken" takeover
  shared/
    Button.jsx
    TopBar.jsx                       → logo + control pills, used on every screen
    ProgressBar.jsx

lib/
  gemini.js                   → server-side API call wrapper
  speech.js                   → Web Speech API wrapper

styles/
  tokens.css                  → ALL colors, fonts, spacing as CSS variables
  globals.css
```

Rules:
- One component = one file. If a file is doing two jobs, split it.
- `useScanner` must stay screen-agnostic — it takes a list of items and returns
  which one is active + a select function. It should never know about letters,
  cards, or cameras specifically.
- Anything reading or writing the camera/blink signal lives only in
  `components/camera/`. No other file should touch MediaPipe directly.
- `TopBar` is the one layout shell reused on every screen — don't build a
  per-screen header from scratch, and don't build a sidebar; this app doesn't
  have one anywhere.
- Server-only code (API keys, Gemini calls) never gets imported into a client
  component. If you're not sure whether a file is client or server, ask.

---

## Working process

- Only work on the part of the app I explicitly ask about. Don't refactor
  unrelated files "while you're in there."
- Before writing code for anything non-trivial, state your plan in 2-4 sentences
  and wait for my go-ahead if I haven't already approved it.
- After making changes, tell me exactly what to click/test to verify it works.
  Don't just say "this should work now."
- If you're stuck after 2-3 fix attempts on the same bug, stop guessing — explain
  what you currently understand is happening, line by line, before trying again.