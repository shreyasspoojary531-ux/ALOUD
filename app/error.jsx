"use client";
import { useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopBar from "../components/shared/TopBar";
import CameraPill from "../components/camera/CameraPill";
import ScanRing from "../components/scanner/ScanRing";
import { useEyeControl } from "../components/shared/EyeControlContext";
import useScanner from "../components/scanner/useScanner";

function RefreshIcon() {
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
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

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

export default function Error({ error, reset }) {
  const router = useRouter();
  const { eyeOn } = useEyeControl();

  const actions = [
    { id: "reset", label: "Try again", action: reset, Icon: RefreshIcon, primary: true },
    { id: "home", label: "Return to Home", action: () => router.push("/home"), Icon: HomeIcon, primary: false },
  ];

  const handleSelect = useCallback(
    (item) => {
      if (item?.action) {
        item.action();
      }
    },
    []
  );

  const { active, select, captureOnset } = useScanner(actions, handleSelect, 2200);

  const blink = useRef(null);
  blink.current = (options) => select(undefined, options);

  const onBlink = useCallback(() => {
    select(undefined, { isBlink: true });
  }, [select]);

  const onBlinkOnset = useCallback(() => {
    captureOnset();
  }, [captureOnset]);

  return (
    <main className="app">
      <TopBar backTo="/home" />

      <section className="not-found-container center" aria-label="Application Error">
        <div className="not-found-card error-card">
          <p className="eyebrow alert-eyebrow">APPLICATION ERROR</p>

          <div className="error-icon-wrap" aria-hidden="true">
            ⚠
          </div>

          <h1 className="not-found-title">Something went wrong</h1>

          <p className="not-found-desc">
            An unexpected error occurred while loading this page. Aloud has captured this issue so you can safely try again or return home.
          </p>

          {error?.message && (
            <details className="error-details">
              <summary className="error-summary">Technical details</summary>
              <pre className="error-code-block">{error.message}</pre>
            </details>
          )}

          <div className="not-found-actions" role="group" aria-label="Error recovery options">
            {actions.map((act, i) => {
              const isActive = i === active;
              const { Icon } = act;

              return (
                <button
                  key={act.id}
                  type="button"
                  className={`not-found-btn ${act.primary ? "primary" : "secondary"} ${
                    isActive ? "active" : ""
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    select(i, { isPointer: true });
                  }}
                  aria-label={act.label}
                >
                  <ScanRing active={isActive} />
                  <span className="btn-icon">
                    <Icon />
                  </span>
                  <span className="btn-label">{act.label}</span>
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
