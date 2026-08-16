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
 */
export function advanceBlink(
  state,
  score,
  now,
  thresholds = DEFAULT_BLINK_THRESHOLDS,
) {
  if (!state.closed && score >= thresholds.close && state.armed) {
    return { ...state, closed: true, closedAt: now, selected: false };
  }
  if (state.closed && score < thresholds.open) {
    const duration = now - state.closedAt;
    const isSelected = state.armed && duration >= thresholds.min && duration <= thresholds.max;
    return {
      closed: false,
      closedAt: 0,
      armed: true,
      selected: isSelected,
    };
  }
  if (state.closed && now - state.closedAt > thresholds.max) {
    return { ...state, armed: false, selected: false };
  }
  return { ...state, selected: false };
}

export default function useBlinkSelect(onLongBlink, thresholds) {
  const callbackRef = useRef(onLongBlink);
  const thresholdsRef = useRef(thresholds || DEFAULT_BLINK_THRESHOLDS);
  const emaRef = useRef(null);
  const openBaselineRef = useRef(0.1);

  const machine = useRef({
    closed: false,
    closedAt: 0,
    armed: true,
    selected: false,
  });

  const phaseRef = useRef("open");
  const [phase, setPhase] = useState("open");

  useEffect(() => {
    callbackRef.current = onLongBlink;
  }, [onLongBlink]);

  useEffect(() => {
    thresholdsRef.current = thresholds || DEFAULT_BLINK_THRESHOLDS;
    machine.current = {
      closed: false,
      closedAt: 0,
      armed: true,
      selected: false,
    };
  }, [thresholds]);

  const ingest = useCallback(
    (rawScore, now = performance.now()) => {
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

      const next = advanceBlink(machine.current, score, now, effectiveThresholds);
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
