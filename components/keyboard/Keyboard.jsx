"use client";
import { useEffect, useMemo, useState } from "react";
import useScanner from "../scanner/useScanner";
import KeyRow from "./KeyRow";

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } else {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, [breakpoint]);

  return isMobile;
}

const letters = (s) => s.split("").map((label) => ({ label }));
const back = { label: "back", icon: "back", kind: "back" };

// Single flat CURSOR row — scans exactly like a letter row (row highlight → open → individual keys)
const cursorRow = {
  label: "CURSOR",
  keys: [
    { label: "home", icon: "home", kind: "action-key" },
    { label: "left", icon: "arrow-left", kind: "nav-key" },
    { label: "backspace", icon: "backspace", kind: "nav-key" },
    { label: "right", icon: "arrow-right", kind: "nav-key" },
    back,
  ],
};

export default function Keyboard({
  message,
  setMessage,
  cursorPos = 0,
  setCursorPos,
  speak,
  blinkSelect,
  keyboardRef,
  enabled = true,
  suggestions = [],
  aiSentences = [],
  isGenerating = false,
  interval = 1800,
}) {
  const isMobile = useIsMobile(900);
  const [opened, setOpened] = useState(null);
  const hasMessage = message.trim().length > 0;

  // Build desktop vs mobile suggestion rows
  const suggestRows = useMemo(() => {
    const sayIt = {
      label: "Say it",
      icon: "message",
      kind: hasMessage ? "say-it-compact" : "say-it-full",
    };

    if (!isMobile) {
      const desktopSayIt = {
        ...sayIt,
        colSpan: hasMessage && suggestions.length > 0 ? 1 : 9,
      };
      const keys =
        hasMessage && suggestions.length > 0
          ? [desktopSayIt, ...suggestions.map((t) => ({ label: t, kind: "suggest" })), back]
          : [desktopSayIt, back];
      return [{ label: "SUGGESTION", kind: "suggest-row", keys }];
    }

    // Mobile suggestions reflow
    if (hasMessage && suggestions.length > 0) {
      if (suggestions.length === 3) {
        return [
          {
            label: "SUGGEST 1",
            kind: "suggest-row",
            keys: [
              sayIt,
              { label: suggestions[0], kind: "suggest" },
              { label: suggestions[1], kind: "suggest" },
              back,
            ],
          },
          {
            label: "SUGGEST 2",
            kind: "suggest-row",
            keys: [{ label: suggestions[2], kind: "suggest", colSpan: 2 }, back],
          },
        ];
      }
      return [
        {
          label: "SUGGESTION",
          kind: "suggest-row",
          keys: [sayIt, ...suggestions.map((t) => ({ label: t, kind: "suggest" })), back],
        },
      ];
    }

    return [
      {
        label: "SUGGESTION",
        kind: "suggest-row",
        keys: [{ ...sayIt, colSpan: 3 }, back],
      },
    ];
  }, [hasMessage, suggestions, isMobile]);

  // Build AI sentence composition rows
  const aiSentenceRows = useMemo(() => {
    if (isGenerating) {
      return [
        {
          label: "AI SENTENCE",
          kind: "ai-sentence-row",
          keys: [
            {
              label: "Composing sentence...",
              kind: "ai-generating-key",
              colSpan: !isMobile ? 8 : 3,
            },
            back,
          ],
        },
      ];
    }
    if (!aiSentences || aiSentences.length === 0) return [];
    if (!isMobile) {
      return [
        {
          label: "AI SENTENCE",
          kind: "ai-sentence-row",
          keys: [
            ...aiSentences.map((s) => ({
              label: s,
              kind: "ai-sentence",
              colSpan: Math.max(2, Math.floor(8 / aiSentences.length)),
            })),
            back,
          ],
        },
      ];
    }
    return aiSentences.map((s, idx) => ({
      label: `AI OPTION ${idx + 1}`,
      kind: "ai-sentence-row",
      keys: [{ label: s, kind: "ai-sentence", colSpan: 3 }, back],
    }));
  }, [aiSentences, isGenerating, isMobile]);

  const rows = useMemo(() => {
    if (!isMobile) {
      return [
        ...suggestRows,
        ...aiSentenceRows,
        { label: "A–I", keys: letters("ABCDEFGHI").concat(back) },
        { label: "J–R", keys: letters("JKLMNOPQR").concat(back) },
        {
          label: "S–Z",
          keys: letters("STUVWXYZ").concat([{ label: "space", kind: "space" }, back]),
        },
        cursorRow,
      ];
    }

    return [
      ...suggestRows,
      ...aiSentenceRows,
      { label: "A–E", keys: letters("ABCDE").concat(back) },
      { label: "F–J", keys: letters("FGHIJ").concat(back) },
      { label: "K–O", keys: letters("KLMNO").concat(back) },
      { label: "P–T", keys: letters("PQRST").concat(back) },
      { label: "U–X", keys: letters("UVWX").concat(back) },
      {
        label: "Y–Z",
        keys: letters("YZ").concat([{ label: "space", kind: "space", colSpan: 2 }, back]),
      },
      cursorRow,
    ];
  }, [suggestRows, aiSentenceRows, isMobile]);

  // Reset opened row if layout changes out of bounds
  useEffect(() => {
    if (opened !== null && opened >= rows.length) {
      setOpened(null);
    }
  }, [rows.length, opened]);

  const { active, select, jumpTo } = useScanner(
    rows,
    (_, i) => setOpened(i),
    interval,
    enabled && opened === null
  );

  useEffect(() => {
    if (enabled && opened === null && blinkSelect) {
      blinkSelect.current = select;
    }
  }, [enabled, opened, blinkSelect, select]);

  useEffect(() => {
    if (keyboardRef) {
      keyboardRef.current = {
        jumpToSuggestions: () => {
          setOpened(null);
          jumpTo(0);
        },
      };
    }
  }, [keyboardRef, jumpTo]);

  const useKey = (key) => {
    if (!key?.label) return;
    const l = key.label.toLowerCase();

    if (l === "back" || key.kind === "back") return setOpened(null);
    if (l.includes("say it") || l === "speak") return speak(message);
    if (l === "home") return location.assign("/home");

    // Cursor navigation — move insertion point, stay in opened row so user can repeat
    if (l === "left") {
      setCursorPos?.((p) => Math.max(0, p - 1));
      return;
    }
    if (l === "right") {
      setCursorPos?.((p) => Math.min(message.length, p + 1));
      return;
    }

    // Delete char immediately before cursor
    if (l === "backspace") {
      if (cursorPos > 0 && message.length > 0) {
        setMessage(message.slice(0, cursorPos - 1) + message.slice(cursorPos));
        setCursorPos?.((p) => Math.max(0, p - 1));
      }
      return;
    }

    if (l === "space") {
      setMessage((m) => m.slice(0, cursorPos) + " " + m.slice(cursorPos));
      setCursorPos?.((p) => p + 1);
      return;
    }

    if (/^[A-Z]$/.test(key.label)) {
      const char = key.label.toLowerCase();
      setMessage((m) => m.slice(0, cursorPos) + char + m.slice(cursorPos));
      setCursorPos?.((p) => p + 1);
      return;
    }

    if ([".", ",", "?"].includes(key.label)) {
      setMessage((m) => m.slice(0, cursorPos) + key.label + m.slice(cursorPos));
      setCursorPos?.((p) => p + 1);
      return;
    }

    if (key.kind === "suggest") {
      const word = key.label;
      setMessage((m) => {
        const before = m.slice(0, cursorPos);
        const after = m.slice(cursorPos);
        const inserted = before.trim() ? ` ${word}` : word;
        setCursorPos?.(before.length + inserted.length);
        return before.trim() ? `${before.trimEnd()} ${word}${after}` : `${word}${after}`;
      });
      return;
    }

    if (key.kind === "ai-generating-key") return;

    if (key.kind === "ai-sentence") {
      setOpened(null);
      setMessage(key.label);
      setCursorPos?.(key.label.length);
    }
  };

  return (
    <>
      {rows.map((row, i) => (
        <KeyRow
          key={row.label}
          row={row}
          active={enabled && i === active}
          opened={opened === i}
          onOpen={() => setOpened(i)}
          onKey={useKey}
          blinkSelect={blinkSelect}
          enabled={enabled}
        />
      ))}
    </>
  );
}
