"use client";
import { useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "../components/shared/TopBar";
import CameraPill from "../components/camera/CameraPill";
import ScanRing from "../components/scanner/ScanRing";
import { useEyeControl } from "../components/shared/EyeControlContext";
import useScanner from "../components/scanner/useScanner";

function HomeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <line x1="6" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="10" y2="8" />
      <line x1="14" y1="8" x2="14" y2="8" />
      <line x1="18" y1="8" x2="18" y2="8" />
      <line x1="6" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="10" y2="12" />
      <line x1="14" y1="12" x2="14" y2="12" />
      <line x1="18" y1="12" x2="18" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  );
}

const ACTIONS = [
  { id: "home", label: "Return to Home", href: "/home", Icon: HomeIcon, primary: true },
  { id: "spell", label: "Spell out a phrase", href: "/spell", Icon: KeyboardIcon, primary: false },
];

export default function NotFound() {
  const router = useRouter();
  const { eyeOn } = useEyeControl();

  const handleSelect = useCallback(
    (action) => {
      if (action?.href) {
        router.push(action.href);
      }
    },
    [router]
  );

  const { active, select, captureOnset } = useScanner(ACTIONS, handleSelect, 2200);

  const blink = useRef(null);
  blink.current = (options) => select(undefined, options);

  const onBlink = useCallback((...args) => {
    select(undefined, { isBlink: true });
  }, [select]);

  const onBlinkOnset = useCallback(() => {
    captureOnset();
  }, [captureOnset]);

  return (
    <main className="app">
      <TopBar spell backTo="/home" />

      <section className="not-found-container center" aria-label="Page not found">
        <div className="not-found-card">
          <p className="eyebrow">PAGE NOT FOUND</p>

          <h1 className="not-found-code">404</h1>

          <h2 className="not-found-title">Looks like you&apos;re off track.</h2>

          <p className="not-found-desc">
            The page or phrase you were looking for doesn&apos;t exist or has moved.
          </p>

          <div className="not-found-actions" role="group" aria-label="Navigation options">
            {ACTIONS.map((action, i) => {
              const isActive = i === active;
              const { Icon } = action;

              return (
                <button
                  key={action.id}
                  type="button"
                  className={`not-found-btn ${action.primary ? "primary" : "secondary"} ${
                    isActive ? "active" : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    select(i, { isPointer: true });
                  }}
                  aria-label={action.label}
                >
                  <ScanRing active={isActive} />
                  <span className="btn-icon">
                    <Icon />
                  </span>
                  <span className="btn-label">{action.label}</span>
                  <span className="btn-arrow" aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <p className="caption">
        The highlight moves on its own · <b>long-blink</b> or click to select
      </p>

      <CameraPill enabled={eyeOn} onLongBlink={onBlink} onBlinkOnset={onBlinkOnset} />
    </main>
  );
}
