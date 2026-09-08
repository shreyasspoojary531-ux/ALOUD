"use client";

/**
 * Isolated wrapper for the alert-playing visual indicator.
 * Internals are swappable in a follow-up prompt without touching SpokenMessageOverlay.
 * Currently renders the pulsing dots placeholder.
 */
export default function AlertPlayingIndicator() {
  return <div className="dots" aria-hidden="true">•••••</div>;
}
