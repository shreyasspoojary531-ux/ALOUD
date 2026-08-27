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

const steps = [
  {
    icon: "⌗",
    title: "Set up eye control",
    text: "A quick check tunes blinking to your eyes and lighting. Tap Start and follow along — it takes about three seconds.",
    intro: true,
  },
  {
    icon: "▣",
    title: "Starting camera…",
    text: "One moment — getting eye control ready. Allow camera access if your browser prompts you.",
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
  const { eyeOn } = useEyeControl();
  const [step, setStep] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const stepRef = useRef(step);
  stepRef.current = step;

  const startTimestampRef = useRef(null);
  const openSamples = useRef([]);
  const closedSamples = useRef([]);

  useEffect(() => {
    prefetchMediaPipe();
  }, []);

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
    openSamples.current = [];
    closedSamples.current = [];
    setStep(1); // Move to "Starting camera…" state
  }, []);

  // Camera permission readiness callback from CameraPill
  const handleCameraReady = useCallback((success) => {
    if (success) {
      setCameraError(false);
      setStep((curr) => (curr === 1 ? 2 : curr));
    } else {
      setCameraError(true);
    }
  }, []);

  const { select } = useScanner(
    [{ label: step === 0 ? "Start" : "Continue" }],
    step === 0 ? handleStart : () => {},
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

  return (
    <main className="app">
      <TopBar onHelp={() => setShowHelp(true)} />
      <div className="screen-center">
        <section className="calibration">
          <div className="cal-icon">{current.icon}</div>
          <h1>{current.title}</h1>
          <p>{current.text}</p>

          {cameraError ? (
            <div className="camera-error-block">
              <p className="error-text">
                Camera access was denied or unavailable. You can use mouse clicks or Spacebar to navigate Aloud.
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
          ) : current.intro ? (
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
        </section>
      </div>

      <CameraPill
        enabled={eyeOn && step > 0}
        onLongBlink={onBlink}
        onBlendshape={handleBlendshape}
        onCameraReady={handleCameraReady}
      />

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </main>
  );
}
