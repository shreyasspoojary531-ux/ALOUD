"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "../../components/shared/TopBar";
import Button from "../../components/shared/Button";
import ProgressBar from "../../components/shared/ProgressBar";
import CameraPill from "../../components/camera/CameraPill";
import useScanner from "../../components/scanner/useScanner";
import { useEyeControl } from "../../components/shared/EyeControlContext";
import { calibratedThresholds } from "../../components/camera/useBlinkSelect";
import { prefetchMediaPipe } from "../../lib/mediapipeLoader";
import HelpModal from "../../components/shared/HelpModal";
import SplashCursor from "../../components/shaders/SplashCursor";
import { useSettings } from "../../components/shared/SettingsContext";

const steps = [
  {
    icon: "⌗",
    title: "Set up eye control",
    text: "A quick check tunes blinking to your eyes and lighting. Tap Start and follow along — it takes about three seconds.",
    intro: true,
  },
  {
    icon: "▣",
    title: "Position your face",
    text: "Center your face in the camera view below until eye tracking is confirmed.",
    indeterminate: true,
  },
  {
    icon: "◉",
    title: "Keep your eyes open",
    text: "Look at the screen naturally.",
    duration: 1000, // 1.0s
    startPct: 25,
    endPct: 50,
  },
  {
    icon: "◉",
    title: "Get ready…",
    text: "Close your eyes when prompted and hold them shut.",
    duration: 800, // 0.8s
    startPct: 50,
    endPct: 75,
  },
  {
    icon: "◉̸",
    title: "Close your eyes now",
    text: "Hold them shut until the check completes.",
    duration: 1200, // 1.2s
    startPct: 75,
    endPct: 100,
  },
];

export default function Setup() {
  const router = useRouter();
  const { eyeOn, mode } = useEyeControl();
  const { cursorTrailEnabled } = useSettings();
  const [step, setStep] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [cameraTimeout, setCameraTimeout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  // Live video stream and detected face landmarks state
  const [stream, setStream] = useState(null);
  const [landmarks, setLandmarks] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState("initializing"); // "initializing" | "searching" | "confirming" | "confirmed" | "warning"
  const [statusText, setStatusText] = useState("Starting camera…");

  const setupVideoRef = useRef(null);
  const stepRef = useRef(step);
  stepRef.current = step;

  const trackingStatusRef = useRef(trackingStatus);
  trackingStatusRef.current = trackingStatus;

  const startTimestampRef = useRef(null);
  const openSamples = useRef([]);
  const closedSamples = useRef([]);

  const stableStartRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const initTimeoutRef = useRef(null);

  useEffect(() => {
    prefetchMediaPipe();
  }, []);

  // Connect MediaStream to the live setup video preview
  useEffect(() => {
    if (stream && setupVideoRef.current) {
      setupVideoRef.current.srcObject = stream;
      setupVideoRef.current.play().catch((err) => {
        console.warn("[Setup] setupVideoRef play failed:", err);
      });
    }
  }, [stream]);

  // Handle sample collection during baseline calibration steps
  const handleBlendshape = useCallback((score) => {
    if (stepRef.current === 2) {
      openSamples.current.push(score);
    } else if (stepRef.current === 4) {
      closedSamples.current.push(score);
    }
  }, []);

  const completeCalibration = useCallback(() => {
    const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    const openAvg = avg(openSamples.current);
    const closedAvg = avg(closedSamples.current);

    if (openSamples.current.length > 5 && closedSamples.current.length > 5) {
      const thresholds = calibratedThresholds(openAvg, closedAvg);
      try {
        localStorage.setItem("aloud_calibration", JSON.stringify(thresholds));
      } catch (e) {}
    }

    if (startTimestampRef.current) {
      const durationMs = performance.now() - startTimestampRef.current;
      console.log(`[PerfBenchmark] Calibration Start to Complete: ${durationMs.toFixed(1)}ms`);
    }

    router.push("/home");
  }, [router]);

  const handleStart = useCallback(() => {
    startTimestampRef.current = performance.now();
    setCameraError(false);
    setCameraTimeout(false);
    openSamples.current = [];
    closedSamples.current = [];
    stableStartRef.current = null;
    setLandmarks(null);
    setTrackingStatus("initializing");
    setStatusText("Starting camera…");
    setStep(1); // Move to Step 1 ("Position your face")
  }, []);

  // Camera permission readiness callback from CameraPill
  const handleCameraReady = useCallback((success) => {
    if (success) {
      setCameraError(false);
      setCameraTimeout(false);
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
      setTrackingStatus("searching");
      setStatusText("Position your face in frame");
    } else {
      setCameraError(true);
      setTrackingStatus("warning");
      setStatusText("Camera access denied or unavailable");
    }
  }, []);

  // Step 1 Camera Init Timeout Safety (12 seconds max waiting for camera ready)
  useEffect(() => {
    if (step === 1 && !cameraError && trackingStatus === "initializing") {
      initTimeoutRef.current = setTimeout(() => {
        if (stepRef.current === 1 && trackingStatusRef.current === "initializing") {
          setCameraTimeout(true);
          setTrackingStatus("warning");
          setStatusText("Initialization taking longer than expected");
        }
      }, 12000);
    }

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current);
    };
  }, [step, cameraError, trackingStatus]);

  const hasTransitionedRef = useRef(false);

  // Track face detection stability during Step 1
  useEffect(() => {
    if (step !== 1 || cameraError || cameraTimeout) return;

    if (landmarks && landmarks.length >= 468) {
      if (!stableStartRef.current) {
        stableStartRef.current = performance.now();
      }

      const elapsed = performance.now() - stableStartRef.current;

      if (elapsed < 1500) {
        if (trackingStatus !== "confirming") {
          setTrackingStatus("confirming");
          setStatusText("Tracking detected eyes… keep still");
        }
      } else {
        if (trackingStatus !== "confirmed") {
          setTrackingStatus("confirmed");
          setStatusText("Eye tracking ready ✓");
        }

        if (!hasTransitionedRef.current) {
          hasTransitionedRef.current = true;
          console.log("[Setup] 1.5s stable eye tracking achieved! Scheduling setStep(2) in 750ms...");
          transitionTimeoutRef.current = setTimeout(() => {
            if (stepRef.current === 1) {
              console.log("[Setup] Step 1 complete -> setStep(2)");
              setStep(2);
            }
          }, 750);
        }
      }
    } else {
      // Face detection lost or searching
      stableStartRef.current = null;
      hasTransitionedRef.current = false;
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      if (trackingStatus !== "confirmed" && trackingStatus !== "initializing") {
        setTrackingStatus("searching");
        setStatusText("Position your face in frame");
      }
    }
  }, [step, landmarks, trackingStatus, cameraError, cameraTimeout]);

  const { select } = useScanner(
    [{ label: step === 0 ? "Start" : "Continue" }],
    step === 0 ? handleStart : () => {}
  );
  const blink = useRef(select);
  blink.current = select;
  const onBlink = useCallback(() => blink.current(undefined, { isBlink: true }), []);

  // Continuous elapsed-time progress animation loop for active calibration steps (step >= 2)
  useEffect(() => {
    if (step < 2 || step >= steps.length) return;

    const currentStep = steps[step];
    const startTime = performance.now();
    let frameId;

    const updateProgress = () => {
      const elapsed = performance.now() - startTime;
      const fraction = Math.min(1, elapsed / currentStep.duration);
      const currentPct = currentStep.startPct + fraction * (currentStep.endPct - currentStep.startPct);

      setProgressPct(currentPct);

      if (fraction < 1) {
        frameId = requestAnimationFrame(updateProgress);
      } else {
        // Step complete
        if (step === steps.length - 1) {
          completeCalibration();
        } else {
          setStep((s) => s + 1);
        }
      }
    };

    frameId = requestAnimationFrame(updateProgress);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [step, completeCalibration]);

  const current = steps[step];

  // Compute corner-bracket reticle coordinates for Left and Right Eyes
  const computeEyeReticle = (pointIndices) => {
    if (!landmarks || landmarks.length < 468) return null;
    const pts = pointIndices.map((idx) => landmarks[idx]).filter(Boolean);
    if (!pts.length) return null;

    const xs = pts.map((p) => p.x * 100);
    const ys = pts.map((p) => p.y * 100);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = maxX - minX;
    const h = maxY - minY;

    const padX = Math.max(w * 0.35, 1.8);
    const padY = Math.max(h * 0.5, 1.8);

    const x1 = minX - padX;
    const x2 = maxX + padX;
    const y1 = minY - padY;
    const y2 = maxY + padY;

    const boxW = x2 - x1;
    const boxH = y2 - y1;
    const arm = Math.min(boxW * 0.28, boxH * 0.28);

    return {
      pathTL: `M ${x1 + arm} ${y1} L ${x1} ${y1} L ${x1} ${y1 + arm}`,
      pathTR: `M ${x2 - arm} ${y1} L ${x2} ${y1} L ${x2} ${y1 + arm}`,
      pathBL: `M ${x1 + arm} ${y2} L ${x1} ${y2} L ${x1} ${y2 - arm}`,
      pathBR: `M ${x2 - arm} ${y2} L ${x2} ${y2} L ${x2} ${y2 - arm}`,
    };
  };

  const leftReticle = computeEyeReticle([33, 133, 159, 145, 158, 144]);
  const rightReticle = computeEyeReticle([362, 263, 386, 374, 385, 373]);

  return (
    <main className="app">
      {mode === "manual" && cursorTrailEnabled && <SplashCursor COLOR="#cf5700" />}
      <TopBar onHelp={() => setShowHelp(true)} />
      <div className="screen-center">
        <section className="calibration">
          {cameraError || cameraTimeout ? (
            <div className="camera-error-block">
              <div className="cal-icon" style={{ color: "var(--salmon)" }}>
                ⚠
              </div>
              <h1>
                {cameraError ? "Camera Access Required" : "Taking Longer Than Expected"}
              </h1>
              <p className="error-text">
                {cameraError
                  ? "Camera access was denied or unavailable. Please allow camera permissions in your browser settings to use eye control."
                  : "Camera initialization is taking longer than expected. Check if another application is using your camera or retry."}
              </p>
              <div className="button-row">
                <Button className="primary" onSelect={handleStart}>
                  Retry Camera
                </Button>
                <Button className="cal-skip-btn" onSelect={() => router.push("/home")}>
                  Continue with Click / Space
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Live Camera Preview & Landmark Overlay Section */}
              {step > 0 && (
                <div className="setup-camera-card">
                  <div className="setup-video-container">
                    <video
                      ref={setupVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="setup-video"
                    />

                    {/* Horizontal Scan-Line Sweep Overlay */}
                    <div className={`setup-scanline-sweep ${trackingStatus}`} />

                    {/* SVG overlay rendering real detected eye corner reticles with white contrast halo */}
                    <svg
                      className="setup-landmarks-svg"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <g transform="scale(-1, 1) translate(-100, 0)">
                        {leftReticle && (
                          <g className={`eye-reticle ${trackingStatus}`}>
                            {/* White contrast halo underneath */}
                            <path d={leftReticle.pathTL} className={`reticle-corner-halo ${trackingStatus}`} />
                            <path d={leftReticle.pathTR} className={`reticle-corner-halo ${trackingStatus}`} />
                            <path d={leftReticle.pathBL} className={`reticle-corner-halo ${trackingStatus}`} />
                            <path d={leftReticle.pathBR} className={`reticle-corner-halo ${trackingStatus}`} />
                            {/* Colored accent stroke on top */}
                            <path d={leftReticle.pathTL} className={`reticle-corner ${trackingStatus}`} />
                            <path d={leftReticle.pathTR} className={`reticle-corner ${trackingStatus}`} />
                            <path d={leftReticle.pathBL} className={`reticle-corner ${trackingStatus}`} />
                            <path d={leftReticle.pathBR} className={`reticle-corner ${trackingStatus}`} />
                          </g>
                        )}
                        {rightReticle && (
                          <g className={`eye-reticle ${trackingStatus}`}>
                            {/* White contrast halo underneath */}
                            <path d={rightReticle.pathTL} className={`reticle-corner-halo ${trackingStatus}`} />
                            <path d={rightReticle.pathTR} className={`reticle-corner-halo ${trackingStatus}`} />
                            <path d={rightReticle.pathBL} className={`reticle-corner-halo ${trackingStatus}`} />
                            <path d={rightReticle.pathBR} className={`reticle-corner-halo ${trackingStatus}`} />
                            {/* Colored accent stroke on top */}
                            <path d={rightReticle.pathTL} className={`reticle-corner ${trackingStatus}`} />
                            <path d={rightReticle.pathTR} className={`reticle-corner ${trackingStatus}`} />
                            <path d={rightReticle.pathBL} className={`reticle-corner ${trackingStatus}`} />
                            <path d={rightReticle.pathBR} className={`reticle-corner ${trackingStatus}`} />
                          </g>
                        )}
                      </g>
                    </svg>
                  </div>

                  {/* Status Badge below Live Video Feed */}
                  <div className={`setup-status-badge ${trackingStatus}`}>
                    <span className="setup-status-dot" />
                    <span>{statusText}</span>
                  </div>
                </div>
              )}

              {step === 0 && <div className="cal-icon">{current.icon}</div>}
              <h1>{current.title}</h1>
              <p>{current.text}</p>

              {current.intro ? (
                <div className="button-row">
                  <Button className="primary cal-start-btn" onSelect={handleStart}>
                    Start
                  </Button>
                  <Button className="cal-skip-btn" onSelect={() => router.push("/home")}>
                    Skip for now
                  </Button>
                </div>
              ) : (
                <ProgressBar value={progressPct} indeterminate={current.indeterminate} />
              )}
            </>
          )}
        </section>
      </div>

      <CameraPill
        enabled={eyeOn && step > 0}
        onLongBlink={onBlink}
        onBlendshape={handleBlendshape}
        onCameraReady={handleCameraReady}
        onStreamReady={setStream}
        onFaceLandmarks={setLandmarks}
      />

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </main>
  );
}
