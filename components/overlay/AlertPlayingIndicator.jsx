"use client";

import SiriWave from "../ui/SiriWave";

/**
 * Visual audio-playing indicator component for SpokenMessageOverlay.
 * Renders the transparent WebGL SiriWave waveform animation when speech is active.
 */
export default function AlertPlayingIndicator() {
  return (
    <div
      className="alert-playing-indicator"
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        margin: "0 auto 1rem auto",
        pointerEvents: "none",
      }}
    >
      <SiriWave
        variant="wave"
        size={360}
        renderScale={1.0}
        className="siri-wave-canvas"
        style={{
          maxWidth: "100%",
          height: "auto",
          background: "transparent",
        }}
      />
    </div>
  );
}
