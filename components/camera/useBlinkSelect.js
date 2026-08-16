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
// A pure state machine keeps normal blinks, resting eyes, and a genuine select distinct.
export function advanceBlink(
  state,
  score,
  now,
  thresholds = DEFAULT_BLINK_THRESHOLDS,
) {
  if (!state.closed && score >= thresholds.close && state.armed)
    return { ...state, closed: true, closedAt: now };
  if (state.closed && score < thresholds.open) {
    const duration = now - state.closedAt;
    return {
      closed: false,
      closedAt: 0,
      armed: true,
      selected: duration >= thresholds.min && duration <= thresholds.max,
    };
  }
  if (state.closed && now - state.closedAt > thresholds.max)
    return { ...state, armed: false };
  return { ...state, selected: false };
}
export default function useBlinkSelect(onLongBlink, thresholds) {
  const callback = useRef(onLongBlink),
    machine = useRef({
      closed: false,
      closedAt: 0,
      armed: true,
      selected: false,
    }),
    phaseRef = useRef("open"),
    [phase, setPhase] = useState("open");
  useEffect(() => {
    callback.current = onLongBlink;
  }, [onLongBlink]);
  useEffect(() => {
    machine.current = {
      closed: false,
      closedAt: 0,
      armed: true,
      selected: false,
    };
  }, [thresholds?.close, thresholds?.open]);
  const ingest = useCallback(
    (score, now = performance.now()) => {
      const next = advanceBlink(machine.current, score, now, thresholds),
        nextPhase = next.closed ? (next.armed ? "closed" : "resting") : "open";
      machine.current = next;
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      if (next.selected) callback.current();
    },
    [thresholds],
  );
  return { ingest, phase, phaseRef };
}
