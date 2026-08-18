"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export const DEFAULT_PALM_THRESHOLDS = {
  open: 1.55,
  close: 1.25,
  min: 350,
  max: 1800,
};

/**
 * Pure state machine handling open palm gesture selection.
 */
export function advancePalm(
  state,
  score,
  now,
  thresholds = DEFAULT_PALM_THRESHOLDS,
  onPalmOnset = null
) {
  // If palm is closed/idle and opens past threshold while armed
  if (!state.openPalm && score >= thresholds.open && state.armed) {
    onPalmOnset?.();
    return { ...state, openPalm: true, openAt: now, selected: false };
  }

  // If palm was open and now closes/lowers below threshold
  if (state.openPalm && score < thresholds.close) {
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

/**
 * Helper to compute 2D Euclidean distance between two MediaPipe landmarks
 */
function dist2D(pt1, pt2) {
  return Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y);
}

export default function usePalmSelect(onOpenPalm, thresholds, onPalmOnset) {
  const callbackRef = useRef(onOpenPalm);
  const onsetCallbackRef = useRef(onPalmOnset);
  const thresholdsRef = useRef(thresholds || DEFAULT_PALM_THRESHOLDS);
  const emaRef = useRef(null);

  const machine = useRef({
    openPalm: false,
    openAt: 0,
    armed: true,
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

      // Hand scale reference (wrist to middle MCP 2D distance)
      const handScale = dist2D(wrist, middleMCP);
      if (handScale < 0.01) return;

      // 1. Calculate 2D Wrist-to-Fingertip distances (Index 8, Middle 12, Ring 16, Pinky 20)
      const fingerTips = [8, 12, 16, 20];
      const wristToTipAvg =
        fingerTips.reduce((sum, tipIdx) => sum + dist2D(wrist, landmarks[tipIdx]), 0) / (4 * handScale);

      // 2. Calculate 2D MCP-to-Fingertip distances for multi-finger extension
      // Index (MCP 5 -> Tip 8), Middle (MCP 9 -> Tip 12), Ring (MCP 13 -> Tip 16), Pinky (MCP 17 -> Tip 20)
      const mcpPairs = [
        { mcp: 5, tip: 8 },
        { mcp: 9, tip: 12 },
        { mcp: 13, tip: 16 },
        { mcp: 17, tip: 20 },
      ];
      const mcpToTipAvg =
        mcpPairs.reduce((sum, pair) => sum + dist2D(landmarks[pair.mcp], landmarks[pair.tip]), 0) /
        (4 * handScale);

      // Composite multi-finger open palm score
      const rawCompositeScore = wristToTipAvg * 0.55 + mcpToTipAvg * 0.70;

      // Exponential Moving Average (EMA) smoothing (alpha = 0.35)
      const alpha = 0.35;
      const score =
        emaRef.current === null
          ? rawCompositeScore
          : alpha * rawCompositeScore + (1 - alpha) * emaRef.current;
      emaRef.current = score;

      const currentThresholds = thresholdsRef.current;
      const next = advancePalm(
        machine.current,
        score,
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
