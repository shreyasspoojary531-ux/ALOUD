'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Screen-agnostic scanning engine hook.
 * Auto-advances active item index on a timer, handles selection via click/blink/spacebar,
 * and pauses briefly during transitions to prevent accidental double-selections.
 */
export default function useScanner(items, onSelect, interval = 1800, enabled = true) {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeRef = useRef(0);
  const selectRef = useRef(onSelect);
  const isPausedRef = useRef(false);

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
  }, [itemsKey]);

  // Auto-advance timer
  useEffect(() => {
    if (!items.length || !enabled || isPaused) return;

    const id = setInterval(() => {
      setActive((i) => (i + 1) % items.length);
    }, interval);

    return () => clearInterval(id);
  }, [items.length, interval, enabled, isPaused, itemsKey]);

  // Selection function called identically by click, spacebar, or blink
  const select = useCallback(
    (index = activeRef.current) => {
      if (isPausedRef.current) return;
      const targetIndex = typeof index === 'number' ? index : activeRef.current;
      const item = items[targetIndex];

      if (item) {
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
    [items]
  );

  // Spacebar fallback listener
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        // Avoid intercepting spacebar when typing in an input field
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [select, enabled]);

  return { active, select, isPaused };
}
