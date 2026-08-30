"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function NarutoExperience() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const narutoVidRef = useRef(null);
  const sasukeVidRef = useRef(null);

  useEffect(() => {
    let cameraInstance = null;
    let handsInstance = null;
    let mounted = true;

    async function loadScriptsAndStart() {
      try {
        // Load MediaPipe CDN scripts dynamically if not already present
        const loadScript = (src) => {
          return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve();
              return;
            }
            const script = document.createElement("script");
            script.src = src;
            script.crossOrigin = "anonymous";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        };

        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

        if (!mounted) return;

        const vElement = videoRef.current;
        const cElement = canvasRef.current;
        const nVid = narutoVidRef.current;
        const sVid = sasukeVidRef.current;

        if (!vElement || !cElement || !nVid || !sVid) return;

        const ctx = cElement.getContext("2d");
        let pwr = [0, 0];
        let wasOpen = [false, false];

        function checkOpen(pts) {
          let count = 0;
          const wrist = pts[0];
          const tips = [8, 12, 16, 20];
          const pips = [6, 10, 14, 18];
          for (let i = 0; i < tips.length; i++) {
            const tip = pts[tips[i]];
            const pip = pts[pips[i]];
            if (Math.hypot(tip.x - wrist.x, tip.y - wrist.y) > Math.hypot(pip.x - wrist.x, pip.y - wrist.y)) {
              count++;
            }
          }
          return count >= 3;
        }

        function onResults(res) {
          if (!mounted || !cElement || !vElement) return;

          cElement.width = vElement.videoWidth || window.innerWidth;
          cElement.height = vElement.videoHeight || window.innerHeight;
          ctx.save();
          ctx.clearRect(0, 0, cElement.width, cElement.height);

          let fL = false;
          let fR = false;

          if (nVid) nVid.style.display = "none";
          if (sVid) sVid.style.display = "none";

          if (res.multiHandLandmarks && res.multiHandedness && window.drawConnectors && window.drawLandmarks && window.HAND_CONNECTIONS) {
            res.multiHandLandmarks.forEach((pts, i) => {
              const label = res.multiHandedness[i]?.label;
              const isR = label === "Right";
              const idx = isR ? 1 : 0;

              // --- CYAN SKELETON RENDER ---
              ctx.save();
              ctx.shadowBlur = 10;
              ctx.shadowColor = "#00fbff";
              window.drawConnectors(ctx, pts, window.HAND_CONNECTIONS, { color: "#00d4ff", lineWidth: 3 });
              window.drawLandmarks(ctx, pts, { color: "#ffffff", lineWidth: 1, radius: 2 });
              ctx.restore();

              const open = checkOpen(pts);
              pwr[idx] += open ? 0.05 : -0.15;
              pwr[idx] = Math.max(0, Math.min(1, pwr[idx]));

              if (open && !wasOpen[idx]) {
                const vid = isR ? sVid : nVid;
                if (vid) {
                  vid.currentTime = 0;
                  vid.play().catch(() => {});
                }
              }
              wasOpen[idx] = open;

              const wrist = pts[0];
              const knk = pts[9];

              if (pwr[idx] > 0.01) {
                if (isR && sVid) {
                  fR = true;
                  const tx = (wrist.x + knk.x) / 2;
                  const ty = (wrist.y + knk.y) / 2;
                  sVid.style.left = `${(1 - tx) * window.innerWidth}px`;
                  sVid.style.top = `${ty * window.innerHeight}px`;
                  sVid.style.display = "block";
                  sVid.style.opacity = pwr[idx];
                } else if (!isR && nVid) {
                  fL = true;
                  const dx = knk.x - wrist.x;
                  const dy = knk.y - wrist.y;
                  const tx = knk.x + dx * 0.8;
                  const ty = knk.y + dy * 0.8;
                  nVid.style.left = `${(1 - tx) * window.innerWidth}px`;
                  nVid.style.top = `${ty * window.innerHeight - 120}px`;
                  nVid.style.display = "block";
                  nVid.style.opacity = pwr[idx];
                }
              }
            });
          }

          if (!fL) {
            pwr[0] = Math.max(0, pwr[0] - 0.15);
            if (pwr[0] > 0.01 && nVid) {
              nVid.style.display = "block";
              nVid.style.opacity = pwr[0];
            }
            wasOpen[0] = false;
          }
          if (!fR) {
            pwr[1] = Math.max(0, pwr[1] - 0.15);
            if (pwr[1] > 0.01 && sVid) {
              sVid.style.display = "block";
              sVid.style.opacity = pwr[1];
            }
            wasOpen[1] = false;
          }
          ctx.restore();
        }

        const hands = new window.Hands({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65,
        });

        hands.onResults(onResults);
        handsInstance = hands;

        const camera = new window.Camera(vElement, {
          onFrame: async () => {
            if (mounted && vElement) {
              await hands.send({ image: vElement });
            }
          },
          width: 1280,
          height: 720,
        });

        await camera.start();
        cameraInstance = camera;
        if (mounted) setLoading(false);
      } catch (err) {
        console.error("Naruto AR init error:", err);
        if (mounted) {
          setError(err.message || "Failed to initialize camera / MediaPipe hands.");
          setLoading(false);
        }
      }
    }

    loadScriptsAndStart();

    return () => {
      mounted = false;
      if (cameraInstance?.stop) {
        try { cameraInstance.stop(); } catch (e) {}
      }
      if (handsInstance?.close) {
        try { handsInstance.close(); } catch (e) {}
      }
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/home" style={styles.backBtn}>
          ← Back to Aloud
        </Link>
        <span style={styles.badge}>🥷 Naruto AR Jutsu Mode</span>
      </div>

      {loading && (
        <div style={styles.loader}>
          <div style={styles.spinner} />
          <p style={styles.loaderText}>Summoning Jutsu & Camera...</p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p>⚠️ {error}</p>
          <p style={{ fontSize: "12px", opacity: 0.8 }}>Please allow camera access and refresh.</p>
        </div>
      )}

      <video ref={videoRef} id="v_src" autoPlay playsInline style={styles.videoFeed} />
      <canvas ref={canvasRef} id="out" style={styles.canvasOverlay} />
      <div style={styles.darkness} />

      <video
        ref={narutoVidRef}
        id="n"
        className="fx"
        src="/naruto/naruto.mp4"
        muted
        autoPlay
        loop
        playsInline
        style={{ ...styles.fxVideo, width: "1200px" }}
      />
      <video
        ref={sasukeVidRef}
        id="s"
        className="fx"
        src="/naruto/sasuke.mp4"
        muted
        autoPlay
        loop
        playsInline
        style={{ ...styles.fxVideo, width: "1600px" }}
      />

      <div style={styles.instructionBanner}>
        Open Left Hand = Rasengan 🌀 | Open Right Hand = Chidori ⚡
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#000000",
    overflow: "hidden",
    zIndex: 9999,
  },
  header: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 30,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "auto",
  },
  backBtn: {
    padding: "8px 16px",
    background: "rgba(20, 20, 20, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease",
  },
  badge: {
    padding: "6px 14px",
    background: "linear-gradient(135deg, #ff6b00 0%, #d9381e 100%)",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    boxShadow: "0 4px 12px rgba(255, 107, 0, 0.4)",
  },
  loader: {
    position: "absolute",
    inset: 0,
    zIndex: 25,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#080808",
    color: "#ffffff",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid rgba(255, 107, 0, 0.2)",
    borderTopColor: "#ff6b00",
    borderRadius: "50%",
    animation: "spin 1s infinite linear",
  },
  loaderText: {
    marginTop: "16px",
    fontSize: "15px",
    fontWeight: 500,
    color: "#d0d0d0",
  },
  errorBox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 26,
    background: "rgba(239, 68, 68, 0.9)",
    color: "#ffffff",
    padding: "20px 28px",
    borderRadius: "12px",
    textAlign: "center",
  },
  videoFeed: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  canvasOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    transform: "scaleX(-1)",
    zIndex: 2,
    pointerEvents: "none",
  },
  darkness: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(10, 5, 0, 0.25)",
    mixBlendMode: "multiply",
    pointerEvents: "none",
    zIndex: 5,
  },
  fxVideo: {
    position: "absolute",
    height: "auto",
    top: 0,
    left: 0,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
    display: "none",
    mixBlendMode: "screen",
    zIndex: 20,
  },
  instructionBanner: {
    position: "absolute",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 30,
    padding: "10px 24px",
    background: "rgba(0, 0, 0, 0.75)",
    border: "1px solid rgba(0, 212, 255, 0.3)",
    borderRadius: "999px",
    color: "#00d4ff",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.03em",
    backdropFilter: "blur(8px)",
    pointerEvents: "none",
  },
};
