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
| **AI Suggestions**| Gemini Flash-Lite API | Server-side next-word prediction (`app/api/suggest/route.js`, `lib/gemini.js`) |
| **Icons** | Custom Inline SVG Components | Hand-crafted SVG icons matching token stroke widths (No `lucide-react`) |

---

## 3. Directory Sitemap & File Responsibilities

```
app/
├── api/
│   └── suggest/route.js     → Server route calling Gemini for next-word/phrase suggestions
├── home/
│   └── page.jsx             → Home screen: Category grid (I feel, I need, People, Answers, Spell CTA)
├── profile/
│   └── page.jsx             → Profile & Speech Analytics metrics screen
├── setup/
│   └── page.jsx             → Step-by-step calibration flow for eye control thresholds
├── spell/
│   └── page.jsx             → Full row-level scanning spelling keyboard
├── layout.jsx               → Root layout wrapping app with EyeControlProvider & SettingsProvider
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
└── shared/
    ├── Button.jsx           → Reusable styled pill buttons
    ├── CustomModeSelect.jsx → Dropdown to select input mode (blink, eyebrow, palm, manual)
    ├── EyeControlContext.jsx→ Context for input mode (blink/eyebrow/palm/manual) & global pause
    ├── HelpModal.jsx        → On-screen guidance and instructions modal
    ├── Icon.jsx             → System SVG icon registry
    ├── ProgressBar.jsx      → Step progress indicator for setup/calibration flow
    ├── SettingsContext.jsx  → Context for voice selection & repeat count settings
    ├── SettingsModal.jsx    → Modal dialog version of Settings
    ├── SettingsPopover.jsx  → Dropdown popover (desktop) & centered modal overlay (mobile) for Settings
    ├── TactileButton.jsx    → Reusable 3D tactile pill CTA button
    ├── TactileSwitch.jsx    → Reusable neumorphic toggle switch with animated LED indicator
    └── TopBar.jsx           → Universal header shell (logo, mode selector, settings, help, mobile drawer)

lib/
├── analytics.js             → Local storage tracking for speech history & analytics metrics
├── coreVocabulary.js        → Offline static seed core vocabulary & frequency ranking model (getSuggestions)
├── gemini.js                → Server-only wrapper calling Google Gemini API
├── mediapipeLoader.js       → Loader for MediaPipe FaceLandmarker and HandLandmarker models
└── speech.js                → Web Speech API synthesis wrapper with retry & queue control

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
- **Auto-Advance**: `setInterval` cycles active index every `interval` ms.
- **Blink Onset Capture (`captureOnset`)**: Locks target item index at the exact frame a blink/gesture starts, ensuring accuracy even if the timer advances before the gesture completes.
- **Pause Synchronization**: Automatically suspends timer advance and ignores selection calls when `isPaused` (from `EyeControlContext`) is `true`.

### Gesture Detection Hooks (`components/camera/`)
1. **`useBlinkSelect.js`**:
   - Ingests blink blendshapes (`eyeBlinkLeft`, `eyeBlinkRight`).
   - Uses hysteresis thresholds to prevent flickering (`closeThreshold`, `openThreshold`, `holdDuration`).
   - Phases: `resting` -> `closed` -> `held` -> `triggered`.
2. **`useEyebrowSelect.js`**:
   - Ingests `browOuterUpLeft` and `browOuterUpRight` scores.
   - Triggers selection when eyebrow raise duration exceeds `holdDuration`.
3. **`usePalmSelect.js`**:
   - Ingests 21 3D hand landmarks.
   - Measures normalized distance between fingertips (Index, Middle, Ring, Pinky) and wrist base landmark `0`.
   - Triggers selection when fist closes (`phase === "closed"`).

### Camera Component (`CameraPill.jsx`)
- Floating pill in bottom-right corner.
- Runs `requestAnimationFrame` loop calling `detector.detectForVideo(video, timestamp)`.
- **Global Pause Handling**: When `ctx.isPaused` is `true` (e.g., mobile sidebar open), skips detection frame ingestion and displays status `"Paused (Menu open)"`. Keeps webcam stream warm without re-requesting permissions.
- **Error Handling**: Gracefully catches `NotReadableError` (camera in use) and `PermissionDeniedError`, showing explicit inline recovery hints and a "Retry camera" button.

---

## 5. Global State & Local Storage Contract

### `EyeControlContext` (`components/shared/EyeControlContext.jsx`)
- **`mode`**: `"blink"` | `"palm"` | `"manual"` (Default: `"blink"`)
- **`eyeOn`**: `boolean` (`mode !== "manual"`)
- **`isPaused`**: `boolean` (Set to `true` when mobile drawer is open to pause scanning & gesture detection)
- **`setMode(newMode)`**: Updates mode and saves to `localStorage.aloud_control_mode`.
- **`setIsPaused(paused)`**: Toggles global tracking pause.
- **Eyebrow Shortcut**: Eyebrow raise is a spell-screen-only shortcut gesture running concurrently in Blink mode, jumping the cursor immediately to row index 0 (the merged suggestion row).

### `SettingsContext` (`components/shared/SettingsContext.jsx`) 
- **`voiceName`**: `string | null` (Selected Web Speech API voice name)
- **`repeatCount`**: `number` (`1` | `2` | `3`, Default: `1`)

### Local Storage Keys
- `aloud_control_mode`: Current input mode string.
- `aloud_voice`: Selected SpeechSynthesis voice name string.
- `aloud_repeat_count`: Integer repeat count (`1`, `2`, or `3`).
- `aloud_calibration`: JSON object containing custom blink thresholds `{ close, open, holdDuration }`.
- `aloud_camera_minimized`: `"true"` | `"false"`.
- `aloud_history`: JSON array of spoken phrase events for analytics.

---

## 6. Page Workflows & Navigation

### 1. Splash Page (`app/page.jsx`)
- Centered brand wordmark "Aloud." with signature orange dot.
- Tagline: *"Speak with your eyes."*
- Interactive `GlassCTACard` preview and `BentoGrid` section explaining 4-step communication.
- Primary CTA: `"Begin with eye control"` -> Navigates to `/setup`.

### 2. Setup / Calibration (`app/setup/page.jsx`)
- 5-step full-screen calibration workflow:
  1. Intro (Start / Skip for now)
  2. "Starting camera…"
  3. "Keep your eyes open" (samples resting baseline)
  4. "Get ready…"
  5. "Close your eyes now" (samples closed threshold)
- Saves thresholds to `localStorage.aloud_calibration` and proceeds to `/home`.

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
- Word Suggestions row (uses offline client-side frequency model `lib/coreVocabulary.js` via `getSuggestions`).
- **Two-tier scanning structure**:
  1. **Row scanning**: Highlights entire rows (Suggestions, A–I, J–R, S–Z + Space, Edit row, Actions row).
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
- Large, bold centered phrase text with transparent WebGL SiriWave orb audio playing indicator (`AlertPlayingIndicator.jsx` rendering `components/ui/SiriWave.jsx`).
- **Caregiver Alert Toast**: Fixed top-right toast notification (`.alert-toast`) with auto-dismiss (3.5s) reflecting real Telegram API send results (`sending`, `sent`, `failed`). Never overlaps central content.
- **Repeat Loop Logic**: Repeats phrase playback strictly up to `repeatCount` (1x, 2x, 3x). Does NOT loop indefinitely.
- **Alert Layout Offsets**: Manually tuned CSS rules in `styles/globals.css`: `.alert-orb-container` (`transform: translateY(-112px) scale(2.9)`) and `.alert-text-container` (`transform: translateY(-109px)`).
- Dismiss button `"✓ I got help"` styled with primary CTA treatment (`TactileButton.terracotta`), stops speech and returns to Home.

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
