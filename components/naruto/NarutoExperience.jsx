"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function NarutoExperience() {
  const [status, setStatus] = useState("Initializing camera...");
  const [cameraError, setCameraError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const narutoVidRef = useRef(null);
  const sasukeVidRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let cameraInstance = null;
    let handsInstance = null;

    setCameraError(null);

    async function loadScript(src) {
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
    }

    async function startExperience() {
      try {
        // Broadcast release event to any background Aloud tabs to free the camera hardware
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("aloud_camera_channel");
            bc.postMessage({ type: "RELEASE_CAMERA" });
            bc.close();
          }
        } catch (e) {}

        if (mounted) setStatus("Loading MediaPipe Hands...");

        // Load MediaPipe scripts from CDN
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

        if (!mounted) return;

        // Allow 350ms for camera hardware locks from other tabs to release
        if (mounted) setStatus("Connecting to webcam...");
        await new Promise((res) => setTimeout(res, 350));
        if (!mounted) return;

        const vElement = videoRef.current;
        const cElement = canvasRef.current;
        const nVid = narutoVidRef.current;
        const sVid = sasukeVidRef.current;

        if (!vElement || !cElement) return;

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

          const w = vElement.videoWidth || window.innerWidth;
          const h = vElement.videoHeight || window.innerHeight;
          if (cElement.width !== w || cElement.height !== h) {
            cElement.width = w;
            cElement.height = h;
          }

          ctx.save();
          ctx.clearRect(0, 0, cElement.width, cElement.height);

          let fL = false;
          let fR = false;

          if (nVid) nVid.style.display = "none";
          if (sVid) sVid.style.display = "none";

          if (
            res.multiHandLandmarks &&
            res.multiHandedness &&
            window.drawConnectors &&
            window.drawLandmarks &&
            window.HAND_CONNECTIONS
          ) {
            res.multiHandLandmarks.forEach((pts, i) => {
              const label = res.multiHandedness[i]?.label;
              const isR = label === "Right";
              const idx = isR ? 1 : 0;

              // --- CYAN HAND SKELETON RENDER ---
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
            if (mounted && vElement && handsInstance) {
              await handsInstance.send({ image: vElement });
            }
          },
          width: 1280,
          height: 720,
        });

        cameraInstance = camera;

        try {
          await camera.start();
          if (mounted) setStatus("");
        } catch (camErr) {
          console.warn("Primary MediaPipe Camera start warning:", camErr);
          await new Promise((res) => setTimeout(res, 400));
          if (!mounted) return;

          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            vElement.srcObject = fallbackStream;
            await vElement.play();
            if (mounted) setStatus("");
          } catch (fallbackErr) {
            throw fallbackErr;
          }
        }
      } catch (err) {
        console.error("Naruto AR error:", err);
        if (mounted) {
          setCameraError(err.message || "Could not access camera.");
          setStatus("");
        }
      }
    }

    startExperience();

    return () => {
      mounted = false;
      if (cameraInstance?.stop) {
        try { cameraInstance.stop(); } catch (e) {}
      }
      if (handsInstance?.close) {
        try { handsInstance.close(); } catch (e) {}
      }
      if (videoRef.current?.srcObject) {
        try {
          videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        } catch (e) {}
      }
    };
  }, [retryKey]);

  const triggerManualJutsu = (type) => {
    const vid = type === "naruto" ? narutoVidRef.current : sasukeVidRef.current;
    if (!vid) return;
    vid.style.display = "block";
    vid.style.opacity = 1;
    vid.style.left = type === "naruto" ? "35%" : "65%";
    vid.style.top = "50%";
    vid.currentTime = 0;
    vid.play().catch(() => {});
    setTimeout(() => {
      if (vid) vid.style.display = "none";
    }, 3000);
  };

  return (
    <div style={styles.container}>
      {/* Top Bar Navigation */}
      <div style={styles.header}>
        <Link href="/home" style={styles.backBtn}>
          ← Back to Aloud
        </Link>
        <span style={styles.badge}>🥷 Naruto Jutsu AR</span>
      </div>

      {/* Loading Status Indicator */}
      {status && (
        <div style={styles.statusPill}>
          <span style={styles.dot} />
          {status}
        </div>
      )}

      {/* Camera Error Message & Interactive Fallback Controls */}
      {cameraError && (
        <div style={styles.errorBox}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>⚠️ Webcam Currently Locked by System</p>
          <p style={{ margin: "8px 0 14px", fontSize: "13px", opacity: 0.9, lineHeight: 1.4 }}>
            Your webcam `/dev/video0` is being used by another tab or app (e.g. Zoom or background browser window).
            Close other camera apps and click <strong>Retry Camera</strong>, or test the Jutsu effects directly below!
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              style={styles.retryBtn}
              onClick={() => setRetryKey((k) => k + 1)}
            >
              🔄 Retry Camera
            </button>
            <button
              type="button"
              style={{ ...styles.retryBtn, background: "#ff6b00", color: "#ffffff" }}
              onClick={() => triggerManualJutsu("naruto")}
            >
              🌀 Test Rasengan
            </button>
            <button
              type="button"
              style={{ ...styles.retryBtn, background: "#00d4ff", color: "#000000" }}
              onClick={() => triggerManualJutsu("sasuke")}
            >
              ⚡ Test Chidori
            </button>
          </div>
        </div>
      )}

      {/* Video Feed & Canvas Overlay */}
      <video ref={videoRef} id="v_src" autoPlay playsInline muted style={styles.videoFeed} />
      <canvas ref={canvasRef} id="out" style={styles.canvasOverlay} />
      <div style={styles.darkness} />

      {/* Rasengan & Chidori Video FX Overlays */}
      <video
        ref={narutoVidRef}
        id="n"
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
        src="/naruto/sasuke.mp4"
        muted
        autoPlay
        loop
        playsInline
        style={{ ...styles.fxVideo, width: "1600px" }}
      />

      {/* Bottom Jutsu Instruction Banner */}
      <div style={styles.instructionBanner}>
        Open Left Hand = Rasengan 🌀 &nbsp;|&nbsp; Open Right Hand = Chidori ⚡
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    inset: 0,
    backgroundColor: "#050505",
    overflow: "hidden",
    zIndex: 9999,
  },
  header: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 40,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "auto",
  },
  backBtn: {
    padding: "8px 18px",
    background: "rgba(20, 20, 20, 0.85)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    backdropFilter: "blur(8px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  },
  badge: {
    padding: "6px 16px",
    background: "linear-gradient(135deg, #ff6b00 0%, #d9381e 100%)",
    borderRadius: "999px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    boxShadow: "0 4px 14px rgba(255, 107, 0, 0.4)",
  },
  statusPill: {
    position: "absolute",
    top: 72,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 35,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 18px",
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "999px",
    color: "#93c5fd",
    fontSize: "13px",
    fontWeight: 500,
    backdropFilter: "blur(6px)",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    boxShadow: "0 0 8px #3b82f6",
  },
  errorBox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 35,
    background: "rgba(15, 23, 42, 0.95)",
    border: "1px solid rgba(255, 107, 0, 0.4)",
    color: "#ffffff",
    padding: "24px 32px",
    borderRadius: "16px",
    textAlign: "center",
    maxWidth: "460px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
  },
  retryBtn: {
    padding: "9px 20px",
    background: "#ffffff",
    color: "#0f172a",
    border: "none",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    transition: "transform 0.15s ease",
  },
  videoFeed: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    objectFit: "cover",
    transform: "scaleX(-1)",
    zIndex: 1,
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
    background: "rgba(0, 0, 0, 0.85)",
    border: "1px solid rgba(0, 212, 255, 0.4)",
    borderRadius: "999px",
    color: "#00d4ff",
    fontSize: "14px",
    fontWeight: 600,
    letterSpacing: "0.03em",
    backdropFilter: "blur(8px)",
    pointerEvents: "none",
    boxShadow: "0 4px 16px rgba(0, 212, 255, 0.2)",
  },
};
