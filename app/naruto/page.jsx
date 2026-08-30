"use client";

import Link from "next/link";

export default function NarutoPage() {
  return (
    <div style={styles.container}>
      {/* Floating Back button overlay outside the iframe */}
      <div style={styles.overlayHeader}>
        <Link href="/home" style={styles.backButton}>
          ← Back to Aloud
        </Link>
      </div>

      {/* Full-viewport iframe rendering the isolated static Naruto demo */}
      <iframe
        src="/naruto/index.html"
        style={styles.iframe}
        allow="camera; microphone; autoplay"
        title="Naruto Hand Tracking AR Experience"
      />
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "#000000",
    overflow: "hidden",
    zIndex: 9999,
  },
  overlayHeader: {
    position: "absolute",
    top: "20px",
    left: "20px",
    zIndex: 10000,
    pointerEvents: "auto",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    backgroundColor: "rgba(18, 18, 18, 0.85)",
    color: "#ffffff",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: "999px",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
    transition: "transform 0.15s ease, backgroundColor 0.15s ease",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  },
};
