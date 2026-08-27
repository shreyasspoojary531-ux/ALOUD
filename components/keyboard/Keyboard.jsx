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

const desktopActions = [
  { label: "home", icon: "heart", kind: "action-key" },
  { label: "speak", icon: "message", kind: "action-key" },
  { label: "rest", icon: "rest", kind: "action-key" },
  { label: "recent", icon: "keyboard", kind: "action-key" },
  { label: "speed", icon: "sun", kind: "action-key" },
  { label: "call for help", icon: "help", kind: "alert", colSpan: 4 },
  back,
];

const mobileActions1 = [
  { label: "home", icon: "heart", kind: "action-key" },
  { label: "speak", icon: "message", kind: "action-key" },
  { label: "rest", icon: "rest", kind: "action-key" },
  { label: "recent", icon: "keyboard", kind: "action-key" },
  back,
];

const mobileActions2 = [
  { label: "speed", icon: "sun", kind: "action-key" },
  { label: "call for help", icon: "help", kind: "alert", colSpan: 2 },
  back,
];

export default function Keyboard({
  message,
  setMessage,
  speak,
  blinkSelect,
  keyboardRef,
  enabled = true,
  suggestions = [],
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
      const keys = hasMessage && suggestions.length > 0
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
            keys: [
              { label: suggestions[2], kind: "suggest", colSpan: 2 },
              back,
            ],
          },
        ];
      }
      return [
        {
          label: "SUGGESTION",
          kind: "suggest-row",
          keys: [
            sayIt,
            ...suggestions.map((t) => ({ label: t, kind: "suggest" })),
            back,
          ],
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

  const rows = useMemo(() => {
    if (!isMobile) {
      return [
        ...suggestRows,
        { label: "A–I", keys: letters("ABCDEFGHI").concat(back) },
        { label: "J–R", keys: letters("JKLMNOPQR").concat(back) },
        {
          label: "S–Z",
          keys: letters("STUVWXYZ").concat([
            { label: "space", kind: "space" },
            back,
          ]),
        },
        {
          label: "EDIT",
          keys: [
            { label: "letter", icon: "no", kind: "action-key" },
            { label: "word", icon: "message", kind: "action-key" },
            { label: "undo", icon: "back", kind: "action-key" },
            { label: "clear", icon: "x-mark", kind: "action-key" },
            { label: "." },
            { label: "," },
            { label: "?", kind: "question-key", colSpan: 3 },
            back,
          ],
        },
        { label: "ACTIONS", keys: desktopActions },
      ];
    }

    // Mobile reflowed rows (fewer keys per row -> larger touch targets)
    return [
      ...suggestRows,
      { label: "A–E", keys: letters("ABCDE").concat(back) },
      { label: "F–J", keys: letters("FGHIJ").concat(back) },
      { label: "K–O", keys: letters("KLMNO").concat(back) },
      { label: "P–T", keys: letters("PQRST").concat(back) },
      { label: "U–X", keys: letters("UVWX").concat(back) },
      {
        label: "Y–Z",
        keys: letters("YZ").concat([
          { label: "space", kind: "space", colSpan: 2 },
          back,
        ]),
      },
      {
        label: "EDIT 1",
        keys: [
          { label: "letter", icon: "no", kind: "action-key" },
          { label: "word", icon: "message", kind: "action-key" },
          { label: "undo", icon: "back", kind: "action-key" },
          { label: "clear", icon: "x-mark", kind: "action-key" },
          back,
        ],
      },
      {
        label: "EDIT 2",
        keys: [
          { label: "." },
          { label: "," },
          { label: "?", kind: "question-key", colSpan: 2 },
          back,
        ],
      },
      { label: "ACTIONS 1", keys: mobileActions1 },
      { label: "ACTIONS 2", keys: mobileActions2 },
    ];
  }, [suggestRows, isMobile]);

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
    if (l.includes("help") || l.includes("call for help")) return speak("I need help.", true);
    if (l === "clear") return setMessage("");
    if (l === "letter") return setMessage((m) => m.slice(0, -1));
    if (l === "word") return setMessage((m) => m.trimEnd().replace(/\S+$/, ""));
    if (l === "space") return setMessage((m) => m + " ");
    if (/^[A-Z]$/.test(key.label)) return setMessage((m) => m + key.label.toLowerCase());
    if ([".", ",", "?"].includes(key.label)) return setMessage((m) => m + key.label);
    if (key.kind === "suggest") {
      return setMessage((m) => (m.trim() ? `${m.trimEnd()} ${key.label}` : key.label));
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
