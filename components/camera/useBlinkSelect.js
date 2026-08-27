"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_BLINK_THRESHOLDS = {
  close: 0.55,
  open: 0.35,
  min: 400,
  max: 2000,
};

export const calibratedThresholds = (openAverage, closedAverage) => {
  const spread = closedAverage - openAverage;
  return !Number.isFinite(spread) || spread < 0.12
    ? DEFAULT_BLINK_THRESHOLDS
    : {
        ...DEFAULT_BLINK_THRESHOLDS,
        close: Math.min(0.9, openAverage + spread * 0.58),
        open: Math.min(0.75, openAverage + spread * 0.3),
      };
};

/**
 * Pure state machine handling hysteresis blink detection.
 * Blendshape score is the primary signal; EAR > 0.26 is used as a secondary rejection filter for motion noise.
 */
export function advanceBlink(
  state,
  score,
  now,
  thresholds = DEFAULT_BLINK_THRESHOLDS,
  onBlinkOnset = null,
  options = {}
) {
  const { ear = null } = options;

  // Primary signal: blendshape score >= close threshold.
  // Secondary rejection: reject ONLY if EAR strongly indicates eyes are wide open (> 0.26).
  const isEarWideOpenRejection = typeof ear === "number" && ear > 0.26;
  const isClosedSignal = score >= thresholds.close && !isEarWideOpenRejection;

  // If eyes are currently open and crossing close threshold while armed
  if (!state.closed && isClosedSignal && state.armed) {
    onBlinkOnset?.();
    return { ...state, closed: true, closedAt: now, selected: false };
  }
  // If eyes were closed and now reopen below open threshold (or EAR confirms open eyes)
  if (state.closed && (score < thresholds.open || (typeof ear === "number" && ear > 0.24))) {
    const duration = now - state.closedAt;
    const isSelected = state.armed && duration >= thresholds.min && duration <= thresholds.max;
    return {
      closed: false,
      closedAt: 0,
      armed: true,
      selected: isSelected,
    };
  }
  // If closed duration exceeds max timeout
  if (state.closed && now - state.closedAt > thresholds.max) {
    return { ...state, armed: false, selected: false };
  }
  return { ...state, selected: false };
}

export default function useBlinkSelect(onLongBlink, thresholds, onBlinkOnset) {
  const callbackRef = useRef(onLongBlink);
  const onsetCallbackRef = useRef(onBlinkOnset);
  const thresholdsRef = useRef(thresholds || DEFAULT_BLINK_THRESHOLDS);
  const emaRef = useRef(null);
  const openBaselineRef = useRef(0.1);
  const openFramesRef = useRef(0);

  // Machine starts UNARMED on mount to guarantee no stale eyes-closed state triggers a false selection
  const machine = useRef({
    closed: false,
    closedAt: 0,
    armed: false,
    selected: false,
  });

  const phaseRef = useRef("open");
  const [phase, setPhase] = useState("open");

  useEffect(() => {
    callbackRef.current = onLongBlink;
  }, [onLongBlink]);

  useEffect(() => {
    onsetCallbackRef.current = onBlinkOnset;
  }, [onBlinkOnset]);

  // Reset machine state to disarmed whenever thresholds/screen re-mounts
  useEffect(() => {
    thresholdsRef.current = thresholds || DEFAULT_BLINK_THRESHOLDS;
    openFramesRef.current = 0;
    machine.current = {
      closed: false,
      closedAt: 0,
      armed: false,
      selected: false,
    };
  }, [thresholds]);

  const ingest = useCallback(
    (rawScore, options = {}) => {
      const now = performance.now();
      const { isMoving = false, ear = null } = options;

      if (typeof rawScore !== "number" || isNaN(rawScore)) return;

      // 1. Exponential Moving Average (EMA) smoothing (alpha = 0.45)
      const alpha = 0.45;
      const score = emaRef.current === null ? rawScore : alpha * rawScore + (1 - alpha) * emaRef.current;
      emaRef.current = score;

      // 2. Slow adaptive baseline for open eyes when score is low (< 0.3)
      if (score < 0.3) {
        openBaselineRef.current = openBaselineRef.current * 0.95 + score * 0.05;
      }

      // 3. Compute effective thresholds
      const currentThresholds = thresholdsRef.current;
      const isCustomCalibrated = currentThresholds.close !== DEFAULT_BLINK_THRESHOLDS.close;

      const effectiveThresholds = isCustomCalibrated
        ? currentThresholds
        : {
            ...currentThresholds,
            close: Math.min(0.85, Math.max(0.48, openBaselineRef.current + 0.38)),
            open: Math.min(0.60, Math.max(0.20, openBaselineRef.current + 0.15)),
          };

      // Arm machine ONLY after eyes have been open for at least 2 consecutive frames
      if (!machine.current.armed && !machine.current.closed) {
        if (score < effectiveThresholds.open && (ear === null || ear > 0.20)) {
          openFramesRef.current += 1;
          if (openFramesRef.current >= 2) {
            machine.current.armed = true;
          }
        } else {
          openFramesRef.current = 0;
        }
      }

      // 4. If rapid head movement or motion cooldown is active, suppress blink detection state machine
      if (isMoving) {
        if (machine.current.closed) {
          machine.current = { closed: false, closedAt: 0, armed: false, selected: false };
          openFramesRef.current = 0;
        }
        phaseRef.current = "open";
        setPhase("open");
        return;
      }

      const next = advanceBlink(
        machine.current,
        score,
        now,
        effectiveThresholds,
        () => onsetCallbackRef.current?.(),
        { ear }
      );
      const nextPhase = next.closed ? (next.armed ? "closed" : "resting") : "open";

      machine.current = next;
      phaseRef.current = nextPhase;
      setPhase(nextPhase);

      if (next.selected && callbackRef.current) {
        callbackRef.current();
      }
    },
    []
  );

  return { ingest, phase, phaseRef };
}
