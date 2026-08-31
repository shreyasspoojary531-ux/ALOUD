"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../components/shared/TopBar";
import Button from "../components/shared/Button";
import LandingSections from "../components/landing/LandingSections";
import HelpModal from "../components/shared/HelpModal";
import SplashCursor from "../components/shaders/SplashCursor";
import { useEyeControl } from "../components/shared/EyeControlContext";
import { useSettings } from "../components/shared/SettingsContext";

export default function Splash() {
  const router = useRouter();
  const { mode } = useEyeControl();
  const { cursorTrailEnabled } = useSettings();
  const [help, setHelp] = useState(false);

  const handleBegin = useCallback(() => {
    router.push("/setup");
  }, [router]);

  return (
    <main className="app">
      {mode === "manual" && cursorTrailEnabled && <SplashCursor COLOR="#cf5700" />}
      <TopBar onHelp={() => setHelp(true)} />

      {/* Hero Splash View */}
      <section className="hero-splash">
        <div className="screen-center">
          <div>
            <h1 className="splash-word">
              Aloud<span className="dot">.</span>
            </h1>
            <p className="tagline">
              A voice for anyone who can speak
              <br />
              only with their eyes.
            </p>
            <div className="splash-cta-container">
              <Button
                className="primary splash-btn"
                onSelect={handleBegin}
              >
                Begin with eye control
              </Button>
            </div>
          </div>
        </div>

        {/* Down Chevron Scroll Indicator */}
        <a
          href="#how-it-works"
          className="scroll-indicator"
          aria-label="Scroll to learn more"
        >
          <span>LEARN MORE</span>
          <svg
            className="scroll-chevron-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </section>

      {/* Scrollable Landing Sections */}
      <LandingSections onSelectCTA={handleBegin} />

      {help && <HelpModal onClose={() => setHelp(false)} />}
    </main>
  );
}

