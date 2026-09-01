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

  // Track face detection stability during Step 1
  useEffect(() => {
    if (step !== 1 || cameraError || cameraTimeout) return;

    if (landmarks && landmarks.length >= 468) {
      if (!stableStartRef.current) {
        stableStartRef.current = performance.now();
      }

      const elapsed = performance.now() - stableStartRef.current;

      if (elapsed < 1500) {
        setTrackingStatus("confirming");
        setStatusText("Tracking detected eyes… keep still");
      } else if (trackingStatus !== "confirmed") {
        setTrackingStatus("confirmed");
        setStatusText("Eye tracking ready ✓");

        // After 750ms in confirmed state, proceed to step 2 ("Keep your eyes open")
        transitionTimeoutRef.current = setTimeout(() => {
          if (stepRef.current === 1) {
            setStep(2);
          }
        }, 750);
      }
    } else {
      // Face detection lost or searching
      stableStartRef.current = null;
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

      if (trackingStatus !== "confirmed" && trackingStatus !== "initializing") {
        setTrackingStatus("searching");
        setStatusText("Position your face in frame");
      }
    }

    return () => {
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
    };
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

  // Compute Left and Right Eye Centers and contour landmarks for SVG overlay
  let leftEye = null;
  let rightEye = null;
  let leftContour = [];
  let rightContour = [];

  if (landmarks && landmarks.length >= 468) {
    const lOuter = landmarks[33];
    const lInner = landmarks[133];
    const lTop = landmarks[159];
    const lBottom = landmarks[145];

    const rOuter = landmarks[362];
    const rInner = landmarks[263];
    const rTop = landmarks[386];
    const rBottom = landmarks[374];

    if (lOuter && lInner && lTop && lBottom) {
      leftEye = {
        cx: ((lOuter.x + lInner.x) / 2) * 100,
        cy: ((lTop.y + lBottom.y) / 2) * 100,
      };
      leftContour = [33, 133, 159, 145, 158, 144]
        .map((idx) => landmarks[idx])
        .filter(Boolean);
    }

    if (rOuter && rInner && rTop && rBottom) {
      rightEye = {
        cx: ((rOuter.x + rInner.x) / 2) * 100,
        cy: ((rTop.y + rBottom.y) / 2) * 100,
      };
      rightContour = [362, 263, 386, 374, 385, 373]
        .map((idx) => landmarks[idx])
        .filter(Boolean);
    }
  }

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

                    {/* SVG overlay rendering real detected eye landmarks */}
                    <svg
                      className="setup-landmarks-svg"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <g transform="scale(-1, 1) translate(-100, 0)">
                        {leftEye && (
                          <>
                            <circle
                              cx={leftEye.cx}
                              cy={leftEye.cy}
                              r="4"
                              className={`landmark-ring ${trackingStatus}`}
                            />
                            <circle
                              cx={leftEye.cx}
                              cy={leftEye.cy}
                              r="1.4"
                              className={`landmark-dot ${trackingStatus}`}
                            />
                            {leftContour.map((pt, i) => (
                              <circle
                                key={`lc-${i}`}
                                cx={pt.x * 100}
                                cy={pt.y * 100}
                                className="landmark-contour-dot"
                              />
                            ))}
                          </>
                        )}
                        {rightEye && (
                          <>
                            <circle
                              cx={rightEye.cx}
                              cy={rightEye.cy}
                              r="4"
                              className={`landmark-ring ${trackingStatus}`}
                            />
                            <circle
                              cx={rightEye.cx}
                              cy={rightEye.cy}
                              r="1.4"
                              className={`landmark-dot ${trackingStatus}`}
                            />
                            {rightContour.map((pt, i) => (
                              <circle
                                key={`rc-${i}`}
                                cx={pt.x * 100}
                                cy={pt.y * 100}
                                className="landmark-contour-dot"
                              />
                            ))}
                          </>
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
