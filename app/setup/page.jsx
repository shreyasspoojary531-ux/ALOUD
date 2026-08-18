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

const steps = [
  {
    icon: "⌗",
    title: "Set up eye control",
    text: "A quick check tunes blinking to your eyes and lighting. Tap Start and follow along — it takes about ten seconds.",
    intro: true,
  },
  {
    icon: "▣",
    title: "Starting camera…",
    text: "One moment — getting eye control ready. Allow the camera if your browser asks.",
    value: 14,
  },
  {
    icon: "◉",
    title: "Keep your eyes open",
    text: "Look at the screen, relaxed.",
    value: 38,
  },
  {
    icon: "◉",
    title: "Get ready…",
    text: "When you hear the beep, close your eyes and hold them shut.",
    value: 60,
  },
  {
    icon: "◉̸",
    title: "Close your eyes now",
    text: "Hold them shut until you hear the next tone.",
    value: 82,
  },
];

export default function Setup() {
  const router = useRouter();
  const { eyeOn, toggleEye } = useEyeControl();
  const [step, setStep] = useState(0);
  const startTimestampRef = useRef(null);

  const openSamples = useRef([]);
  const closedSamples = useRef([]);

  // Prefetch MediaPipe model & WASM binaries in background as soon as calibration mounts
  useEffect(() => {
    prefetchMediaPipe();
  }, []);

  const handleBlendshape = useCallback((score) => {
    if (step === 2) {
      openSamples.current.push(score);
    } else if (step === 4) {
      closedSamples.current.push(score);
    }
  }, [step]);

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

  const next = useCallback(() => {
    if (step === steps.length - 1) {
      completeCalibration();
    } else {
      setStep((x) => x + 1);
    }
  }, [step, completeCalibration]);

  const handleStart = useCallback(() => {
    startTimestampRef.current = performance.now();
    console.log("[PerfBenchmark] Calibration 'Start' clicked at:", startTimestampRef.current);
    next();
  }, [next]);

  const { select } = useScanner(
    [{ label: step === 0 ? "Start" : "Continue" }],
    step === 0 ? handleStart : next,
  );
  const blink = useRef(select);
  blink.current = select;
  const onBlink = useCallback(() => blink.current(undefined, { isBlink: true }), []);

  useEffect(() => {
    if (step && step < steps.length) {
      const id = setTimeout(next, step === 1 ? 1600 : 2600);
      return () => clearTimeout(id);
    }
  }, [step, next]);

  const current = steps[step];

  return (
    <main className="app">
      <TopBar
        eyeOn={eyeOn}
        toggleEye={toggleEye}
        onHelp={() => router.push("/")}
      />
      <div className="screen-center">
        <section className="calibration">
          <div className="cal-icon">{current.icon}</div>
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
            <ProgressBar value={current.value} />
          )}
        </section>
      </div>
      {/* Camera only enables once user clicks Start (step > 0) */}
      <CameraPill enabled={eyeOn && step > 0} onLongBlink={onBlink} onBlendshape={handleBlendshape} />
    </main>
  );
}
