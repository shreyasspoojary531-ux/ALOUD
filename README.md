# Aloud — Eye-controlled AAC

Aloud is an eye-controlled augmentative and alternative communication (AAC) app. It lets users who can only move their eyes build sentences and have them spoken aloud. The project focuses on clarity, accessibility, and minimal friction for low-mobility users.

## Key principles
- Design for eye- and switch-only input: large clear targets, one focal point per screen.
- Accessibility-first: accessible names, screen-reader support, contrast and reduced-motion respect.
- Minimal, deliberate visual language: all tokens come from `styles/tokens.css`.
- Keep implementations small, clear, and well-justified — prefer short, readable code.

## Tech stack
- React 19
- Next.js (App Router)
- Plain CSS with design tokens (no Tailwind or CSS-in-JS)
- `@mediapipe/tasks-vision` for eye/blink tracking
- Web Speech API for text-to-speech
- Gemini 2.5 Flash (`lib/gemini.js`, server-side REST API) for next-word suggestions

## Quick start
1. Install dependencies:

```
npm install
```

2. Run the development server:

```
npm run dev
```

Notes: API keys (`GEMINI_API_KEY`) must be provided via `.env.local` and used only on the server.

## Project conventions (summary)
- Do not add npm packages without approval — propose them first.
- All colors, fonts, and spacing must come from `styles/tokens.css`.
- One component per file. `useScanner` must remain screen-agnostic.
- Camera and MediaPipe code must live under `components/camera/`.
- Server-only code (`lib/gemini.js`) belongs in `lib/` and `app/api/suggest/route.js`.

## Local Storage Keys
- `aloud_control_mode`: Active input mode (`blink`, `eyebrow`, `palm`, `manual`).
- `aloud_voice_name`: Selected SpeechSynthesis voice name.
- `aloud_repeat_count`: Configured repeat count (`1`, `2`, `3`).
- `aloud_calibration`: Custom eye-blink threshold configuration object.
- `aloud_analytics_events`: Persistent array of spoken phrase metrics.

## API Routes
- `POST /api/suggest`: Server route expecting JSON body `{ message: "text" }`. Calls Gemini 2.5 Flash to return `{ suggestions: ["phrase1", "phrase2", "phrase3"] }`. Features a 4s minimum-interval rate limit guard.

## Error handling & fallbacks
- Camera unavailable or permission denied → fall back to keyboard/spacebar selection and show an inline message.
- No face detected → gentle on-screen indicator, avoid spamming errors.
- Gemini suggestion failures or missing `GEMINI_API_KEY` → keyboard continues to work smoothly with zero suggestions shown.
- Speech synthesis unavailable → show composed message as text.

## Accessibility checklist
- Provide accessible names for all scannable elements.
- Do not rely on color alone to convey state.
- Respect `prefers-reduced-motion` while still communicating dwell/time.
- Use contrast ratios of at least 4.5:1 for body text.

## File structure (important files)
See the enforced structure in `.agents/AGENTS.md`; main locations:

- `app/` — top-level pages and app entry
- `components/` — UI components: `camera/`, `scanner/`, `keyboard/`, `home/`, `shared/`
- `lib/gemini.js` — server-side Gemini 2.5 Flash REST client
- `lib/speech.js` — Web Speech API wrapper
- `styles/tokens.css` — design tokens (colors, spacing, type)

## Development process
- Work only on explicitly requested areas — avoid unrelated refactors.
- Describe non-trivial plans in 2–4 sentences before implementing.
- Small, focused commits with plain-language messages.

## Where to look first
- Read `.agents/AGENTS.md` and `.agents/MEMORY.md` for full rules and guidance.
- `.agents/READ.md` for step-by-step codebase reading roadmap.
- `styles/tokens.css` for the design system.
- `components/scanner/useScanner.js` for core scan/select logic.
