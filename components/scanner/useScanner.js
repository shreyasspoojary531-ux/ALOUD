'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
export default function useScanner(items, onSelect, interval = 1800, enabled = true) {
  const [active, setActive] = useState(0), activeRef = useRef(0), selectRef = useRef(onSelect);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { setActive(0); }, [items.length]);
  useEffect(() => { if (!items.length || !enabled) return; const id = setInterval(() => setActive(i => (i + 1) % items.length), interval); return () => clearInterval(id); }, [items.length, interval, enabled]);
  const select = useCallback((index = activeRef.current) => { const item = items[index]; if (item) selectRef.current(item, index); }, [items]);
  useEffect(() => { if (!enabled) return; const key = e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); select(); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [select,enabled]);
  return { active, select };
}
