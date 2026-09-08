"use client";

import SiriWave from "../ui/SiriWave";

/**
 * Visual audio-playing indicator component for SpokenMessageOverlay.
 * Renders the WebGL SiriWave waveform animation when speech is active.
 */
export default function AlertPlayingIndicator() {
  return (
    <div className="alert-playing-indicator" aria-hidden="true">
      <SiriWave
        variant="wave"
        size={220}
        renderScale={0.8}
        className="siri-wave-canvas"
        style={{
          margin: "0 auto 1.5rem auto",
          borderRadius: "24px",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
          background: "#000000",
        }}
      />
    </div>
  );
}
