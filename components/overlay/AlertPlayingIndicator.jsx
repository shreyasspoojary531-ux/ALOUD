"use client";

import SiriWave from "../ui/SiriWave";

/**
 * Visual audio-playing indicator component for SpokenMessageOverlay.
 * Renders the transparent WebGL SiriWave orb visualizer when speech is active.
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
        margin: "0 auto",
        pointerEvents: "none",
      }}
    >
      <SiriWave
        variant="wave"
        size={320}
        renderScale={0.85}
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
