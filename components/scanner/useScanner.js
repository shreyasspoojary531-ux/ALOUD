'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEyeControl } from '../shared/EyeControlContext';

/**
 * Screen-agnostic scanning engine hook.
 * Auto-advances active item index on a timer, handles selection via click/blink/spacebar,
 * locks target index at blink onset, and pauses briefly during transitions to prevent accidental double-selections.
 */
export default function useScanner(items, onSelect, interval = 1800, enabled = true) {
  const { eyeOn, isPaused: globalPaused } = useEyeControl();
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const activeRef = useRef(0);
  const onsetIndexRef = useRef(null);
  const selectRef = useRef(onSelect);
  const isPausedRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Reset active index when item set changes
  const itemsKey = items.map((x) => x.label || x).join(',');
  useEffect(() => {
    setActive(0);
    activeRef.current = 0;
    onsetIndexRef.current = null;
  }, [itemsKey]);

  // Auto-advance timer (paused if local or global tracking is paused)
  useEffect(() => {
    if (!items.length || !enabled || isPaused || globalPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      // Synchronous guard prevents interval ticks if pause was requested before unmount
      if (isPausedRef.current || globalPaused) return;
      setActive((i) => (i + 1) % items.length);
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [items.length, interval, enabled, isPaused, globalPaused, itemsKey]);

  // Captures the active item index at the exact moment a blink begins (onset)
  const captureOnset = useCallback(() => {
    if (globalPaused) return;
    onsetIndexRef.current = activeRef.current;
  }, [globalPaused]);

  // Selection function with mode validation options
  const select = useCallback(
    (index = undefined, options = {}) => {
      if (isPausedRef.current || globalPaused) return;
      const { isPointer = false, isBlink = false } = options;

      // Exclusive Input Mode:
      // When Eye Control is ON, mouse clicks on scan targets must NOT select.
      if (eyeOn && isPointer) return;
      // When Eye Control is OFF, blink detection must NOT trigger select.
      if (!eyeOn && isBlink) return;

      // Synchronously stop auto-advance timer immediately at selection onset
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Prefer target index captured at blink onset over current auto-advanced index
      let targetIndex;
      if (typeof index === 'number') {
        targetIndex = index;
      } else if (onsetIndexRef.current !== null) {
        targetIndex = onsetIndexRef.current;
      } else {
        targetIndex = activeRef.current;
      }
      onsetIndexRef.current = null;

      const item = items[targetIndex];

      if (item) {
        // Synchronously lock active state and ref to targetIndex to eliminate 1-frame highlight jump
        setActive(targetIndex);
        activeRef.current = targetIndex;
        setSelectedIndex(targetIndex);
        setTimeout(() => setSelectedIndex(null), 400);

        // Pause scanning briefly to prevent transition multi-triggers
        isPausedRef.current = true;
        setIsPaused(true);
        selectRef.current(item, targetIndex);

        setTimeout(() => {
          isPausedRef.current = false;
          setIsPaused(false);
        }, 400);
      }
    },
    [items, eyeOn, globalPaused]
  );

  // Spacebar fallback listener (works in both modes for testing, disabled when globally paused)
  useEffect(() => {
    if (!enabled || globalPaused) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        select(activeRef.current, { isSpace: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [select, enabled, globalPaused]);

  // Synchronously moves scanner highlight cursor to target index without selecting
  const jumpTo = useCallback(
    (index) => {
      if (typeof index === 'number' && index >= 0 && index < items.length) {
        setActive(index);
        activeRef.current = index;
        onsetIndexRef.current = null;
      }
    },
    [items.length]
  );

  return { active, select, isPaused, selectedIndex, captureOnset, jumpTo };
}
