"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_EYEBROW_THRESHOLDS = {
  raise: 0.40,
  lower: 0.20,
  min: 350,
  max: 1800,
};

/**
 * Pure state machine handling hysteresis eyebrow raise gesture detection.
 */
export function advanceEyebrow(
  state,
  score,
  now,
  thresholds = DEFAULT_EYEBROW_THRESHOLDS,
  onRaiseOnset = null
) {
  // If brows are resting and cross raise threshold while armed
  if (!state.raised && score >= thresholds.raise && state.armed) {
    onRaiseOnset?.();
    return { ...state, raised: true, raisedAt: now, selected: false };
  }

  // If brows were raised and now lower back below threshold
  if (state.raised && score < thresholds.lower) {
    const duration = now - state.raisedAt;
    const isSelected = state.armed && duration >= thresholds.min && duration <= thresholds.max;
    return {
      raised: false,
      raisedAt: 0,
      armed: true,
      selected: isSelected,
    };
  }

  // If raised duration exceeds max timeout
  if (state.raised && now - state.raisedAt > thresholds.max) {
    return { ...state, armed: false, selected: false };
  }

  return { ...state, selected: false };
}

export default function useEyebrowSelect(onLongRaise, thresholds, onRaiseOnset) {
  const callbackRef = useRef(onLongRaise);
  const onsetCallbackRef = useRef(onRaiseOnset);
  const thresholdsRef = useRef(thresholds || DEFAULT_EYEBROW_THRESHOLDS);
  const emaRef = useRef(null);
  const restingBaselineRef = useRef(0.08);
  const openFramesRef = useRef(0);

  const machine = useRef({
    raised: false,
    raisedAt: 0,
    armed: false,
    selected: false,
  });

  const phaseRef = useRef("resting");
  const [phase, setPhase] = useState("resting");

  useEffect(() => {
    callbackRef.current = onLongRaise;
  }, [onLongRaise]);

  useEffect(() => {
    onsetCallbackRef.current = onRaiseOnset;
  }, [onRaiseOnset]);

  useEffect(() => {
    thresholdsRef.current = thresholds || DEFAULT_EYEBROW_THRESHOLDS;
    openFramesRef.current = 0;
    machine.current = {
      raised: false,
      raisedAt: 0,
      armed: false,
      selected: false,
    };
  }, [thresholds]);

  const ingest = useCallback(
    (rawScore, options = {}) => {
      const now = performance.now();
      const { isMoving = false } = options;

      if (typeof rawScore !== "number" || isNaN(rawScore)) return;

      // 1. Exponential Moving Average (EMA) smoothing (alpha = 0.40)
      const alpha = 0.40;
      const score = emaRef.current === null ? rawScore : alpha * rawScore + (1 - alpha) * emaRef.current;
      emaRef.current = score;

      // 2. Slow adaptive baseline for resting eyebrows when score is low (< 0.2)
      if (score < 0.2) {
        restingBaselineRef.current = restingBaselineRef.current * 0.95 + score * 0.05;
      }

      const currentThresholds = thresholdsRef.current;
      const effectiveThresholds = {
        ...currentThresholds,
        raise: Math.min(0.85, Math.max(0.35, restingBaselineRef.current + 0.30)),
        lower: Math.min(0.50, Math.max(0.15, restingBaselineRef.current + 0.12)),
      };

      // Arm machine ONLY after eyebrows have been resting for at least 2 consecutive frames
      if (!machine.current.armed && !machine.current.raised) {
        if (score < effectiveThresholds.lower) {
          openFramesRef.current += 1;
          if (openFramesRef.current >= 2) {
            machine.current.armed = true;
          }
        } else {
          openFramesRef.current = 0;
        }
      }

      if (isMoving) {
        if (machine.current.raised) {
          machine.current = { raised: false, raisedAt: 0, armed: false, selected: false };
          openFramesRef.current = 0;
        }
        phaseRef.current = "resting";
        setPhase("resting");
        return;
      }

      const next = advanceEyebrow(
        machine.current,
        score,
        now,
        effectiveThresholds,
        () => onsetCallbackRef.current?.()
      );
      const nextPhase = next.raised ? (next.armed ? "raised" : "resting") : "resting";

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
