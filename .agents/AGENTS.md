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
- Strictly use skills inside .agents/skill read all the skills and use it and AGENTS.md
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

---

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
  apple design skills inside skills folder

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

Use these consistently everywhere instead of inventing new ones per component:
- Desktop: ≥900px — sidebar layout
- Mobile: <900px — top bar + floating camera pill
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
  page.jsx                 → Home screen only
  spell/page.jsx            → Spell-it-out keyboard screen
  api/
    suggest/route.js        → Gemini call, server-side only

components/
  scanner/
    useScanner.js            → core scan-cycle + select logic (screen-agnostic)
    ScanRing.jsx              → the visual dwell-time indicator
  keyboard/
    Keyboard.jsx
    KeyRow.jsx
  camera/
    CameraPanel.jsx           → webcam feed + blink detection wiring
  home/
    CategoryGrid.jsx
    CategoryCard.jsx
  shared/
    Button.jsx
    TopBar.jsx

lib/
  gemini.js                  → server-side API call wrapper
  speech.js                  → Web Speech API wrapper

styles/
  tokens.css                 → ALL colors, fonts, spacing as CSS variables
  globals.css
```

Rules:
- One component = one file. If a file is doing two jobs, split it.
- `useScanner` must stay screen-agnostic — it takes a list of items and returns
  which one is active + a select function. It should never know about letters,
  cards, or cameras specifically.
- Anything reading or writing the camera/blink signal lives only in
  `components/camera/`. No other file should touch MediaPipe directly.
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
- Strictly use skills inside .agents/skill read all the skills and use it and AGENTS.md