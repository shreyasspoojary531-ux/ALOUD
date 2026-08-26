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
 * - Open hand (fistScore <= openThreshold) = resting idle state (re-arms machine).
 * - Closed fist (fistScore >= closeThreshold) held for ~380-500ms = selection action.
 * - Fires select EXACTLY ONCE per closed fist hold.
 * - Re-opening motion (transitioning to open state) ONLY resets state, NEVER fires select.
 */
export function advancePalm(
  state,
  fistScore,
  now,
  thresholds = DEFAULT_PALM_THRESHOLDS,
  onPalmOnset = null
) {
  // 1. Hand returns to OPEN state (below openThreshold):
  // Pure state reset + re-arm gate for next gesture. NEVER fires select.
  if (fistScore <= thresholds.open) {
    return {
      closedFist: false,
      closedAt: 0,
      armed: true,
      hasSelected: false,
      selected: false,
    };
  }

  // 2. Fist CLOSES past closeThreshold while armed
  if (!state.closedFist && fistScore >= thresholds.close && state.armed) {
    onPalmOnset?.();
    return {
      closedFist: true,
      closedAt: now,
      armed: true,
      hasSelected: false,
      selected: false,
    };
  }

  // 3. Sustained closed fist hold duration met -> FIRE SELECT EXACTLY ONCE
  if (state.closedFist && state.armed && !state.hasSelected) {
    const duration = now - state.closedAt;
    if (duration >= thresholds.min && duration <= thresholds.max) {
      return {
        ...state,
        hasSelected: true, // Mark selection fired for this fist hold
        armed: false,      // Disarm until hand fully returns to open state (fistScore <= openThreshold)
        selected: true,
      };
    }
  }

  // 4. Max timeout disarm to prevent endless hold
  if (state.closedFist && now - state.closedAt > thresholds.max) {
    return {
      ...state,
      closedFist: true,
      armed: false,
      hasSelected: true,
      selected: false,
    };
  }

  // Maintain current state with selected = false
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
        callbackRef.current();
      }
    },
    []
  );

  return { ingest, phase, phaseRef };
}
