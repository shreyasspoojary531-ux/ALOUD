"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_PALM_THRESHOLDS = {
  close: 0.65,
  open: 0.35,
  min: 380,
  max: 1800,
};

/**
 * Pure state machine handling closed fist gesture selection.
 * - Open hand = idle / resting state
 * - Closed fist held for ~380-500ms = selection action
 * - Fires select ONCE when hold duration is met while fist is closed
 * - Hand must re-open before next selection can trigger
 */
export function advancePalm(
  state,
  fistScore,
  now,
  thresholds = DEFAULT_PALM_THRESHOLDS,
  onPalmOnset = null
) {
  // 1. Re-arm machine ONLY when hand returns to open state below openThreshold
  if (!state.armed && fistScore <= thresholds.open) {
    return { ...state, armed: true, hasSelected: false };
  }

  // 2. Fist closes past closeThreshold while armed
  if (!state.closedFist && fistScore >= thresholds.close && state.armed) {
    onPalmOnset?.();
    return { ...state, closedFist: true, closedAt: now, hasSelected: false, selected: false };
  }

  // 3. Sustained closed fist hold duration met while closed -> FIRE SELECT IMMEDIATELY!
  if (state.closedFist && state.armed && !state.hasSelected) {
    const duration = now - state.closedAt;
    if (duration >= thresholds.min && duration <= thresholds.max) {
      console.log("[PalmSelect DIAGNOSTIC 1] Closed fist hold duration met! Fire selection.", {
        duration: Math.round(duration),
        fistScore: fistScore.toFixed(2),
      });
      return {
        ...state,
        hasSelected: true,
        armed: false, // Disarm until hand fully re-opens
        selected: true,
      };
    }
  }

  // 4. Hand re-opens
  if (state.closedFist && fistScore <= thresholds.open) {
    return {
      ...state,
      closedFist: false,
      closedAt: 0,
      selected: false,
    };
  }

  // 5. Max timeout disarm to prevent duplicate triggers on continuous hold
  if (state.closedFist && now - state.closedAt > thresholds.max) {
    return { ...state, closedFist: false, closedAt: 0, armed: false, selected: false };
  }

  return { ...state, selected: false };
}

/**
 * Helper to compute 2D Euclidean distance between two MediaPipe landmarks
 */
function dist2D(pt1, pt2) {
  return Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
}

export default function usePalmSelect(onClosedFistSelect, thresholds, onPalmOnset) {
  const callbackRef = useRef(onClosedFistSelect);
  const onsetCallbackRef = useRef(onPalmOnset);
  const thresholdsRef = useRef(thresholds || DEFAULT_PALM_THRESHOLDS);
  const emaRef = useRef(null);

  const machine = useRef({
    closedFist: false,
    closedAt: 0,
    armed: true,
    hasSelected: false,
    selected: false,
  });

  const phaseRef = useRef("resting");
  const [phase, setPhase] = useState("resting");

  useEffect(() => {
    callbackRef.current = onClosedFistSelect;
  }, [onClosedFistSelect]);

  useEffect(() => {
    onsetCallbackRef.current = onPalmOnset;
  }, [onPalmOnset]);

  useEffect(() => {
    thresholdsRef.current = thresholds || DEFAULT_PALM_THRESHOLDS;
    machine.current = {
      closedFist: false,
      closedAt: 0,
      armed: true,
      hasSelected: false,
      selected: false,
    };
  }, [thresholds]);

  const ingest = useCallback(
    (landmarks) => {
      const now = performance.now();

      if (!landmarks || landmarks.length < 21) return;

      const wrist = landmarks[0];
      const middleMCP = landmarks[9];

      // Hand scale reference (wrist 0 to middle MCP 9 2D distance)
      const handScale = dist2D(wrist, middleMCP);
      if (handScale < 0.01) return;

      // Calculate 2D Wrist-to-Fingertip distances (Index 8, Middle 12, Ring 16, Pinky 20)
      const fingerTips = [8, 12, 16, 20];
      const avgWristToTip =
        fingerTips.reduce((sum, tipIdx) => sum + dist2D(wrist, landmarks[tipIdx]), 0) / (4 * handScale);

      // Normalized Fist Closure Score:
      // Open hand (avgWristToTip ~ 1.80) -> score 0.0
      // Closed fist (avgWristToTip ~ 1.10) -> score 1.0
      const rawFistScore = Math.max(0, Math.min(1, (1.80 - avgWristToTip) / 0.70));

      // Exponential Moving Average (EMA) smoothing (alpha = 0.35)
      const alpha = 0.35;
      const fistScore =
        emaRef.current === null
          ? rawFistScore
          : alpha * rawFistScore + (1 - alpha) * emaRef.current;
      emaRef.current = fistScore;

      const currentThresholds = thresholdsRef.current;
      const next = advancePalm(
        machine.current,
        fistScore,
        now,
        currentThresholds,
        () => onsetCallbackRef.current?.()
      );
      const nextPhase = next.closedFist ? "closed" : "resting";

      machine.current = next;
      phaseRef.current = nextPhase;
      setPhase(nextPhase);

      if (next.selected && callbackRef.current) {
        console.log("[PalmSelect DIAGNOSTIC 2 & 3] Invoking onClosedFistSelect callback!");
        callbackRef.current();
      }
    },
    []
  );

  return { ingest, phase, phaseRef };
}
