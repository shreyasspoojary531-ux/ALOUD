# Aloud — Comprehensive Project Memory & Architecture Guide

This document is the single source of truth for the **Aloud** codebase architecture, state flow, design system, component contracts, input control engines, and operational rules.

---

## 1. Product Context & Core Mandate

**Aloud** is an eye-controlled Augmentative and Alternative Communication (AAC) web application designed specifically for individuals with severe motor limitations (e.g., ALS, locked-in syndrome, cerebral palsy, spinal cord injuries).

### Core Design Philosophy
- **Primary Persona**: Users who communicate using only eye movement, blinks, or subtle head/hand gestures. They have no fine motor control and zero tolerance for visual clutter or navigation fumbles.
- **Secondary Persona**: Caregivers and speech therapists observing or assisting the user.
- **Key Mandate**: Every technical and UI decision must answer: *"Does this make it easier for someone with no fine motor control and no time to fumble through menus?"*
- **Visual Distinction**: Aloud uses an elegant, accessibility-first design system with warm cream backgrounds, terracotta/burnt orange primary accents, serif typography for spoken output, and distinct category color tints. It avoids generic template UI components.

---

## 2. Technical Stack & Dependencies

| Layer | Technology | Usage & Scope |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.1.1 (App Router) | Core app structure, routing, server API routes |
| **UI Library** | React 19.2.3 | Component tree & client state |
| **Styling** | Vanilla CSS (`styles/tokens.css`, `styles/globals.css`) | Design tokens, animations, media queries. **No Tailwind, no CSS-in-JS, no UI kits.** |
| **Vision AI** | `@mediapipe/tasks-vision` | Real-time face & hand landmark detection via WebAssembly |
| **Speech** | Web Speech API | Native browser SpeechSynthesis text-to-speech wrapper (`lib/speech.js`) |
| **AI Suggestions**| Gemini 3.5 Flash-Lite REST API | Server-side next-word prediction (`app/api/suggest/route.js`, `lib/gemini.js`) |
| **Icons** | Custom Inline SVG Components | Hand-crafted SVG icons matching token stroke widths (No `lucide-react`) |
| **PWA / SW** | Web App Manifest & Service Worker | Production-only app shell caching (`app/manifest.js`, `public/sw.js`, icons: `icon-192.png`, `icon-512.png`, `maskable-icon-*.png`) |

---

## 3. Directory Sitemap & File Responsibilities

```
app/
├── api/
│   ├── suggest/route.js               → Server route executing Gemini 3.6 Flash for suggestions (POST { message })
│   └── telegram/
│       ├── get-chat-id/route.js       → Server route fetching pending Telegram chat_ids via getUpdates (GET) & processing command updates
│       ├── send-alert/route.js        → Server route sending Telegram alert messages via sendMessage (POST { chat_id, message })
│       └── webhook/route.js           → Server webhook endpoint receiving Telegram updates (POST)
├── error.jsx                → Eye-controlled application error boundary page with recovery options
├── global-error.jsx         → Critical root layout error fallback screen
├── home/
│   └── page.jsx             → Home screen: Category grid (I feel, I need, People, Answers, Spell CTA)
├── not-found.jsx            → Eye-controlled 404 page with navigation CTAs
├── naruto/
│   └── page.jsx             → Secret AR Easter egg wrapper screen rendering isolated static iframe (/naruto/index.html with unmuted audio activation on user gesture)
├── profile/
│   └── page.jsx             → Profile & Speech Analytics metrics screen
├── settings/
│   └── page.jsx             → Dedicated Full Settings screen (Bento Grid layout): Caregiver Alerts, Eyebrow shortcut, Custom Phrases, Adaptive speed, Cursor trail, Profile link
├── setup/
│   └── page.jsx             → Step-by-step calibration flow for eye control thresholds
├── spell/
│   └── page.jsx             → Full row-level scanning spelling keyboard
├── not-found.jsx           → Eye-controlled 404 Not Found error page
├── page.jsx                 → Splash / Landing page with feature showcases
└── template.jsx             → Route transition wrapper

components/
├── camera/
│   ├── CameraPill.jsx       → Floating webcam pill, MediaPipe frame loop & error handler
│   ├── useBlinkSelect.js    → Blink gesture detection hook with hysteresis thresholds
│   ├── useEyebrowSelect.js  → Eyebrow raise detection hook using face blendshapes
│   └── usePalmSelect.js     → Hand landmark fist closure detection hook
├── home/
│   ├── CategoryCard.jsx     → Individual category card with color tinting & ScanRing integration
│   └── CategoryGrid.jsx     → 2x2 grid container managing scanner items for home categories
├── keyboard/
│   ├── Keyboard.jsx         → Spell keyboard container managing row scanning & word suggestions
│   └── KeyRow.jsx           → Individual keyboard row component scanning keys inside an active row
├── landing/
│   ├── BentoGrid.jsx        → "How it works" 4-step bento card layout with inline SVGs
│   ├── GlassCTACard.jsx     → Interactive 3D glass effect CTA card for splash screen
│   ├── LandingSections.jsx  → Scrollable landing page sections container
│   ├── ScrollObserver.jsx   → Intersection Observer trigger for scroll animations
│   └── TextEffects.jsx      → Animated typography components
├── overlay/
│   └── SpokenMessageOverlay.jsx → Full-screen speech takeover overlay with repeat loop management
├── scanner/
│   ├── ScanRing.jsx         → SVG dwell-time progress ring indicator
│   └── useScanner.js        → Core screen-agnostic scanning engine hook
├── shaders/
│   ├── AppBackground.jsx       → Production-ready client-hydrated WarpField background component (speed 10, streak 0.70, tile 0.30, hue -140, opacity 0.20)
│   ├── SplashCursor.jsx        → Open-source WebGL fluid simulation cursor effect (rendered ONLY on Landing & Setup pages when mode === "manual" AND cursorTrailEnabled === true)
│   └── warp-field/
│       ├── WarpFieldBackground.jsx → Bulletproof rAF 60fps ThreeUI WarpField background component (500 emerald streaks + 50 luminous tiles)
│       └── warpFieldRenderer.js    → Three.js WebGL renderer with THREE.Clock delta timing, transparent clear color, soft fog, FOV & Centering
└── shared/
    ├── Button.jsx           → Reusable styled pill buttons
    ├── CustomModeSelect.jsx → Dropdown to select input mode (blink, eyebrow, palm, manual)
    ├── EyeControlContext.jsx→ Context for input mode (blink/eyebrow/palm/manual) & global pause
    ├── HelpModal.jsx        → On-screen guidance and instructions modal
    ├── Icon.jsx             → System SVG icon registry
    ├── ProgressBar.jsx      → Step progress indicator for setup/calibration flow
    ├── CustomPhrasesModal.jsx → Modal overlay for managing user custom phrases (add/delete per category)
    ├── OfflineBanner.jsx    → Non-blocking connectivity banner shown when browser goes offline
    ├── SettingsContext.jsx  → Context for voice, repeat, custom phrases, adaptive dwell, cursor trail settings
    ├── SettingsPopover.jsx  → Dropdown popover (desktop) & centered modal overlay (mobile) for Settings
    └── TopBar.jsx           → Universal header shell (logo, mode selector, settings, help, mobile drawer)

lib/
├── adaptiveDwell.js         → Separate additive adaptive scan speed engine (between-session dwell adaptation)
├── analytics.js             → Local storage tracking for speech history & analytics metrics
├── gemini.js                → Server-only REST client calling Google Gemini 3.5 Flash-Lite API
├── mediapipeLoader.js       → Loader for MediaPipe FaceLandmarker and HandLandmarker models
└── speech.js                → Web Speech API synthesis wrapper with retry & queue control

public/
├── manifest.json            → PWA application manifest for standalone offline capability
├── offline.html             → Standalone offline HTML page (Zero Chrome Dino page on reload when offline)
└── sw.js                    → Service Worker caching app shell and offline fallbacks

styles/
├── globals.css              → Layouts, animations, media queries, component classes
├── overrides.css            → Third-party override styles
└── tokens.css               → Single source of truth for design tokens (colors, fonts, spacing)
```

---

## 4. Input Control Engine & Detection Hooks

### The Dual Input Rule
Every scannable element in Aloud MUST respond to:
1. **Mouse / Touch Click**: Direct pointer click.
2. **Gesture Signal**: Long blink, eyebrow raise, or palm fist closure via MediaPipe.
3. **Spacebar Key**: Keyboard fallback for testing/switch access.

**Mode Validation**:
- When Eye Control is **ON** (`eyeOn === true`): Direct mouse clicks on scanning targets are ignored (`if (eyeOn && isPointer) return;`) to prevent accidental pointer taps during eye tracking.
- When Eye Control is **OFF** (`mode === "manual"`): Gesture signals are ignored.

### Scanning Engine (`useScanner.js`)
- **Signature**: `useScanner(items, onSelect, interval = 1800, enabled = true)`
- **Auto-Advance**: `setInterval` cycles active index every `interval` ms, managed via `timerRef`.
- **Synchronous Timer Clearing**: Immediately calls `clearInterval(timerRef.current)` and sets `active` / `activeRef` to `targetIndex` upon `select()`, preventing event-loop race conditions and 1-frame highlight flickers/jumps.
- **Blink Onset Capture (`captureOnset`)**: Locks target item index at the exact frame a blink/gesture starts, ensuring accuracy even if the timer advances before the gesture completes.
- **Pause Synchronization**: Automatically suspends timer advance and ignores selection calls when `isPaused` (from `EyeControlContext`) is `true` or `isPausedRef.current` is set.

### Gesture Detection Hooks (`components/camera/`)
1. **`useBlinkSelect.js`**:
   - Ingests blink blendshapes (`eyeBlinkLeft`, `eyeBlinkRight`) and 3D Eye Aspect Ratio (`ear`).
   - Uses **Blendshape score ($\ge 0.55$) as primary signal**, with **EAR ($> 0.26$) as a secondary rejection filter** to eliminate motion noise spikes without breaking detection on natural eye closures.
   - Suppresses detection during rapid head movement AND during a **400ms post-motion cooldown window** to prevent false triggers while landmarks settle.
   - Phases: `resting` -> `closed` -> `held` -> `triggered`.
2. **`useEyebrowSelect.js`**:
   - Ingests `browOuterUpLeft` and `browOuterUpRight` scores.
   - Thresholds tuned for natural, comfortable eyebrow raises ($\text{raise} \ge 0.22$, adaptive $\text{restingBaseline} + 0.14$).
   - Triggers selection when eyebrow raise duration exceeds `holdDuration`.
3. **`usePalmSelect.js`**:
   - Ingests 21 3D hand landmarks.
   - Measures normalized distance between fingertips (Index, Middle, Ring, Pinky) and wrist base landmark `0`.
   - Triggers selection when fist closes (`phase === "closed"`). Untouched and fully preserved.

### Camera Component (`CameraPill.jsx`)
- Floating pill in bottom-right corner.
- Runs `requestAnimationFrame` loop calling `detector.detectForVideo(video, timestamp)`.
- Calculates 3D Eye Aspect Ratio (EAR) from eye landmark coordinates (33, 133, 159, 145, 158, 144 for left eye; 362, 263, 386, 374, 385, 373 for right eye).
- Enforces a **400ms motion cooldown timer** (`motionCooldownUntilRef`) after head movement is detected (`rawMotion > 0.020`).
- **Global Pause Handling**: When `ctx.isPaused` is `true` (e.g., mobile sidebar open), skips detection frame ingestion and displays status `"Paused (Menu open)"`. Keeps webcam stream warm without re-requesting permissions.
- **Error Handling**: Gracefully catches `NotReadableError` (camera in use) and `PermissionDeniedError`, showing explicit inline recovery hints and a "Retry camera" button.

---

## 5. Global State & Local Storage Contract

### `EyeControlContext` (`components/shared/EyeControlContext.jsx`)
- **`mode`**: `"blink"` | `"eyebrow"` | `"palm"` | `"manual"` (Default: `"blink"`)
- **`eyeOn`**: `boolean` (`mode !== "manual"`)
- **`isPaused`**: `boolean` (Set to `true` when mobile drawer is open to pause scanning & gesture detection)
- **`setMode(newMode)`**: Updates mode and saves to `localStorage.aloud_control_mode`.
- **`setIsPaused(paused)`**: Toggles global tracking pause.

### `SettingsContext` (`components/shared/SettingsContext.jsx`)
- **`voiceName`**: `string | null` (Selected Web Speech API voice name)
- **`repeatCount`**: `number | "loop"` (`1` | `2` | `3` | `"loop"`, Default: `1`). `"loop"` repeats speech continuously until dismissed.
- **`eyebrowShortcut`**: `boolean` (Default: `false`). Opt-in shortcut: in Eye blink mode on the Spell screen, raising eyebrows jumps scanner cursor directly to AI suggestions (`jumpTo(0)`).
- **`customPhrases`**: `Array<{ id: string, text: string, category: string, isEmergency?: boolean }>` (Default: `[]`). User-added custom phrases saved into categories (`I feel`, `I need`, `People`, `Answers`), rendered as native category cards with optional emergency flag and saved in `localStorage.aloud_custom_phrases`.
- **`adaptiveDwellEnabled`**: `boolean` (Default: `false`). Opt-in setting to adapt scanner dwell pacing between sessions based on user success vs correction rates.
- **`adaptedDwellDuration`**: `number` (Default: `1800ms`). Computed dwell duration passed into `useScanner`. Safe bounds: `1200ms` min floor, `3200ms` max ceiling.
- **`telegramAlertMode`**: `"emergency"` | `"all"` (Default: `"emergency"`). Caregiver Telegram notification routing mode: `"emergency"` routes alerts strictly for phrases marked `isEmergency: true` and the "call for help" action; `"all"` routes notifications for every spoken/typed phrase.
- **`cursorTrailEnabled`**: `boolean` (Default: `false`). Opt-in setting to show the WebGL fluid ink-trail cursor effect on Landing and Setup pages (manual mouse mode only). When `false`, the `SplashCursor` component is fully unmounted — no canvas, no mouse listeners, no animation loop.

### Local Storage Keys
- `aloud_control_mode`: Current input mode string.
- `aloud_voice_name`: Selected SpeechSynthesis voice name string.
- `aloud_repeat_count`: Repeat setting string (`"1"`, `"2"`, `"3"`, or `"loop"`).
- `aloud_eyebrow_shortcut`: `"true"` | `"false"`.
- `aloud_telegram_alert_mode`: `"emergency"` | `"all"`.
- `aloud_custom_phrases`: JSON array of user-added custom phrase objects `{ id, text, category, isEmergency }`.
- `aloud_adaptive_dwell`: `"true"` | `"false"`.
- `aloud_adapted_dwell_ms`: Number string representing adapted dwell milliseconds.
- `aloud_dwell_metrics`: JSON object tracking session successes and corrections `{ successes, corrections }`.
- `aloud_calibration`: JSON object containing custom blink thresholds `{ close, open, holdDuration }`.
- `aloud_camera_minimized`: `"true"` | `"false"` (Read in `useEffect` post-hydration in `CameraPill.jsx` to prevent SSR mismatch).
- `aloud_cursor_trail_enabled`: `"true"` | `"false"` (Default: `"false"`). Controls SplashCursor WebGL fluid simulation on Landing and Setup pages.
- `aloud_analytics_events`: JSON array of spoken phrase events for analytics.

---

## 6. Page Workflows & Navigation

### 1. Splash Page (`app/page.jsx`)
- Centered brand wordmark "Aloud." with signature orange dot.
- Tagline: *"Speak with your eyes."*
- Interactive `GlassCTACard` preview and `BentoGrid` section explaining 4-step communication.
- Primary CTA: `"Begin with eye control"` -> Navigates to `/setup`.

### 2. Setup / Calibration (`app/setup/page.jsx`)
- Redesigned 5-step full-screen calibration workflow with live camera feed and real-time landmark tracking:
  1. Intro ("Set up eye control", Start / Skip for now)
  2. "Position your face" (Live mirrored video feed, SVG eye landmark dot overlay, 1.5s stable detection confirmation state machine, status badge, 12s camera-init safety timeout)
  3. "Keep your eyes open" (1.0s, samples resting baseline, progress 25% -> 50%)
  4. "Get ready…" (0.8s, instructs user to prepare, progress 50% -> 75%)
  5. "Close your eyes now" (1.2s, samples closed threshold, progress 75% -> 100%)
- Live eye landmark overlay: SVG overlay rendering real detected eye centers and eye contour dots, with pulsing glow during confirmation and solid green confirmation state.
- Step Transition Timer Fix: Prevented high-frequency (60 FPS) `landmarks` state updates from triggering the `useEffect` cleanup function (`clearTimeout`), allowing the 750ms step transition timer to fire cleanly and advance to Step 2.
- Camera Readiness State Machine Fix: `handleCameraReady(true)` transitions `trackingStatus` from `"initializing"` to `"searching"` (`statusText`: `"Position your face in frame"`), clearing the camera init timeout so it never misfires while video is playing.
- Timeout & Error Handling: 12.0s camera init safety timeout triggers error state only if `onCameraReady(true)` is never received, providing "Retry Camera" and "Continue with Click / Space" fallback options.
- Total active sampling duration: 3.0 seconds. Saves thresholds to `localStorage.aloud_calibration` and proceeds to `/home`.

### 3. Home Screen (`app/home/page.jsx`)
- Eyebrow label: `"WHAT WOULD YOU LIKE TO SAY?"`
- 2x2 Category Grid:
  - **I feel** (Soft rose tint) -> Sub-grid: Happy, Tired, In pain, Cold, Hot, Sick
  - **I need** (Soft gold tint) -> Sub-grid: Water, Food, Restroom, Help, Glasses, Turn position
  - **People** (Soft slate blue tint) -> Sub-grid: Doctor, Nurse, Family, Friend, Caregiver
  - **Answers** (Soft sage green tint) -> Sub-grid: Yes, No, Maybe, Thank you, Please
- Full-width CTA Card: **"Spell it out"** -> Navigates to `/spell`.
- Selecting any phrase triggers speech playback and opens `SpokenMessageOverlay`.

### 4. Spelling Keyboard (`app/spell/page.jsx`)
- Top bar with Back arrow to Home, centered page title, and mode dropdown.
- Live message line displaying current composed text.
- AI Word Suggestions row (calls POST `/api/suggest` with JSON `{ message }`).
- **Two-tier scanning structure**:
  1. **Row scanning**: Highlights entire rows.
     - **Desktop (≥900px)**: 10-column layout (SUGGESTION, A–I, J–R, S–Z + Space, EDIT, ACTIONS).
     - **Mobile (<900px)**: Reflowed into shorter ranges for ≥44px touch targets (SUGGESTION, A–E, F–J, K–O, P–T, U–X, Y–Z + Space, EDIT 1, EDIT 2, ACTIONS 1, ACTIONS 2).
  2. **Key scanning**: Selecting a row locks focus to scan individual keys inside that row.
- **Alert Action**: `"Call for help"` key styled with alert red tone (`--salmon`).

### 5. Profile & Analytics (`app/profile/page.jsx`)
- Real-time speech statistics calculated from `lib/analytics.js`:
  - Total phrases spoken
  - Most used category
  - Session history list with timestamps
- Data management: "Clear history" button.

### 6. Spoken Message Overlay (`SpokenMessageOverlay.jsx`)
- Full-screen takeover when a message is spoken.
- Large, bold centered phrase text with pulsing top dot indicators.
- **Urgency Styling**: Routine messages use normal cream background; urgent phrases (containing "help", "breathe", etc.) shift to warm red/salmon background.
- **Repeat Loop Logic**: Repeats phrase playback strictly up to `repeatCount` (1x, 2x, 3x). Does NOT loop indefinitely.
- Dismiss button `"✓ I got help"` stops speech and returns to Home.

---

## 7. Responsive Mobile Navigation (<900px)

- **Mobile Breakpoint**: `<900px` (handled by CSS media queries and JS `useIsMobile(900)` hook).
- **Top Bar Appearance**: Desktop controls (mode select, help, settings) are hidden inline. Header displays **ONLY Logo + Hamburger button**.
- **Mobile Sidebar Drawer**:
  - Unmounted from React DOM when closed (`isMobile && mobileMenuOpen`).
  - Slides in from right when hamburger button is tapped.
  - Contains Input Mode selector, Help button, Settings button, and Profile link.
- **Sequential Overlay Flow**:
  - Tapping Settings, Help, or Profile inside the mobile sidebar closes the sidebar **FIRST** (180ms slide-out animation).
  - Only after the sidebar finishes closing does the target modal/overlay open (prevents visual stacking/overlap).
- **Tracking Freeze**: Opening the mobile drawer sets `isPaused = true`, immediately freezing scanner auto-advance and MediaPipe gesture ingestion until closed.

---

## 8. Design Tokens & Styling Rules

All styling MUST reference design variables from `styles/tokens.css`. Never hardcode hex colors or static px values inline.

### Color Tokens
- `--bg`: `#FAF7F2` (Warm cream background)
- `--paper`: `#FFFFFF` (Card background)
- `--ink`: `#28221B` (Primary text color)
- `--muted`: `#7A7063` (Secondary text color)
- `--line`: `#E8E1D7` (Border color)
- `--orange`: `#CF5700` (Burnt orange primary accent)
- `--orange-pale`: `#FFF3EA` (Selected state tint)
- `--salmon`: `#E05A47` (Alert / Urgent state tone)
- `--rose-bg` / `--rose-icon`: `#FCEBEB` / `#C84B4B` (I feel category tint)
- `--gold-bg` / `--gold-icon`: `#FCF5E5` / `#9B7100` (I need category tint)
- `--sage-bg` / `--sage-icon`: `#EEF5F0` / `#3B7A4E` (Answers category tint)
- `--slate-bg` / `--slate-icon`: `#EFF4F8` / `#3B6B8C` (People category tint)

### Typography Tokens
- `--serif`: `"Instrument Serif", Georgia, serif` (Headlines & spoken text)
- `--sans`: `"Inter", system-ui, sans-serif` (Buttons, labels, body text)

---

## 9. Code Maintenance & Agent Guidelines

1. **Keep `MEMORY.md` Updated**: After completing any change, refactor, feature addition, or bug fix, update this document (`.agents/MEMORY.md`) to keep context 100% accurate.
2. **Read `AGENTS.md` & `MEMORY.md` First**: Always consult these files at the beginning of any session.
3. **No Unapproved NPM Packages**: Do not add new npm packages without explicit permission. Use native Web APIs and custom inline components.
4. **No Code Churn**: Only edit files directly relevant to the user's explicit request. Do not reformat or refactor unrelated files.
5. **Verify Builds**: Always run `npm run build` after changes to confirm Next.js production compilation with zero errors.
