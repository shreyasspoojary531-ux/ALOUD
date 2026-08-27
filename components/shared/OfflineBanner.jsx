"use client";
import { useEffect, useState } from "react";

/**
 * Detects browser online/offline state and displays a non-blocking banner
 * when connectivity is lost. Non-blocking because the core AAC app
 * (categories, scanning, speech synthesis, gesture detection) works fully
 * offline — only Gemini AI suggestions require internet.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check initial state after hydration
    setIsOffline(!navigator.onLine);

    const goOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="offline-banner" role="alert" aria-live="assertive">
      <div className="offline-banner-inner">
        <svg
          className="offline-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <div className="offline-text">
          <strong>You're offline</strong>
          <span>Aloud still works — AI suggestions are paused until you reconnect.</span>
        </div>
        <button
          type="button"
          className="offline-dismiss-btn"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offline notice"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
