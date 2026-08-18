"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_PALM_THRESHOLDS = {
  open: 1.65,
  close: 1.35,
  min: 400,
  max: 2000,
};

/**
 * Pure state machine handling open palm gesture selection.
 */
export function advancePalm(
  state,
  ratio,
  now,
  thresholds = DEFAULT_PALM_THRESHOLDS,
  onPalmOnset = null
) {
  // If palm is closed/idle and opens past threshold while armed
  if (!state.openPalm && ratio >= thresholds.open && state.armed) {
    onPalmOnset?.();
    return { ...state, openPalm: true, openAt: now, selected: false };
  }

  // If palm was open and now closes/lowers below threshold
  if (state.openPalm && ratio < thresholds.close) {
    const duration = now - state.openAt;
    const isSelected = state.armed && duration >= thresholds.min && duration <= thresholds.max;
    return {
      openPalm: false,
      openAt: 0,
      armed: true,
      selected: isSelected,
    };
  }

  // If open duration exceeds max timeout
  if (state.openPalm && now - state.openAt > thresholds.max) {
    return { ...state, armed: false, selected: false };
  }

  return { ...state, selected: false };
}

export default function usePalmSelect(onOpenPalm, thresholds, onPalmOnset) {
  const callbackRef = useRef(onOpenPalm);
  const onsetCallbackRef = useRef(onPalmOnset);
  const thresholdsRef = useRef(thresholds || DEFAULT_PALM_THRESHOLDS);
  const emaRef = useRef(null);

  const machine = useRef({
    openPalm: false,
    openAt: 0,
    armed: false,
    selected: false,
  });

  const phaseRef = useRef("closed");
  const [phase, setPhase] = useState("closed");

  useEffect(() => {
    callbackRef.current = onOpenPalm;
  }, [onOpenPalm]);

  useEffect(() => {
    onsetCallbackRef.current = onPalmOnset;
  }, [onPalmOnset]);

  useEffect(() => {
    thresholdsRef.current = thresholds || DEFAULT_PALM_THRESHOLDS;
    machine.current = {
      openPalm: false,
      openAt: 0,
      armed: true,
      selected: false,
    };
  }, [thresholds]);

  const ingest = useCallback(
    (landmarks) => {
      const now = performance.now();

      if (!landmarks || landmarks.length < 21) return;

      const wrist = landmarks[0];
      const middleMCP = landmarks[9];

      // Hand scale reference (wrist to middle MCP distance)
      const handScale = Math.hypot(
        middleMCP.x - wrist.x,
        middleMCP.y - wrist.y,
        (middleMCP.z || 0) - (wrist.z || 0)
      );

      if (handScale < 0.01) return;

      // Calculate distance of index (8), middle (12), ring (16), and pinky (20) tips to wrist (0)
      const tips = [8, 12, 16, 20];
      const avgTipDist =
        tips.reduce((sum, idx) => {
          const pt = landmarks[idx];
          return (
            sum +
            Math.hypot(
              pt.x - wrist.x,
              pt.y - wrist.y,
              (pt.z || 0) - (wrist.z || 0)
            )
          );
        }, 0) / 4;

      const rawRatio = avgTipDist / handScale;

      // EMA smoothing (alpha = 0.40)
      const alpha = 0.40;
      const ratio = emaRef.current === null ? rawRatio : alpha * rawRatio + (1 - alpha) * emaRef.current;
      emaRef.current = ratio;

      const currentThresholds = thresholdsRef.current;
      const next = advancePalm(
        machine.current,
        ratio,
        now,
        currentThresholds,
        () => onsetCallbackRef.current?.()
      );
      const nextPhase = next.openPalm ? "open" : "closed";

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
