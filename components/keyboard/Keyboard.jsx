"use client";
import { useEffect, useMemo, useState } from "react";
import useScanner from "../scanner/useScanner";
import KeyRow from "./KeyRow";

const letters = (s) => s.split("").map((label) => ({ label }));
const back = { label: "back", icon: "back", kind: "back" };

const actions = [
  { label: "home", icon: "heart", kind: "action-key" },
  { label: "speak", icon: "message", kind: "action-key" },
  { label: "rest", icon: "rest", kind: "action-key" },
  { label: "recent", icon: "keyboard", kind: "action-key" },
  { label: "speed", icon: "sun", kind: "action-key" },
  { label: "call for help", icon: "help", kind: "alert", colSpan: 4 },
  back,
];

export default function Keyboard({
  message,
  setMessage,
  speak,
  blinkSelect,
  enabled = true,
  suggestions = [],
}) {
  const [opened, setOpened] = useState(null);
  const hasMessage = message.trim().length > 0;

  // SUGGESTION row: when no AI suggestions exist, "Say it" button spans columns 1-9
  const suggestRow = useMemo(() => {
    const sayIt = {
      label: "Say it",
      icon: "message",
      kind: hasMessage ? "say-it-compact" : "say-it-full",
      colSpan: hasMessage && suggestions.length > 0 ? 1 : 9,
    };
    const keys = hasMessage && suggestions.length > 0
      ? [sayIt, ...suggestions.map((t) => ({ label: t, kind: "suggest" })), back]
      : [sayIt, back];
    return { label: "SUGGESTION", kind: "suggest-row", keys };
  }, [hasMessage, suggestions]);

  const rows = useMemo(() => [
    suggestRow,
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
    { label: "ACTIONS", keys: actions },
  ], [suggestRow]);

  const { active, select } = useScanner(
    rows,
    (_, i) => setOpened(i),
    1800,
    enabled && opened === null
  );

  useEffect(() => {
    if (enabled && opened === null && blinkSelect) {
      blinkSelect.current = select;
    }
  }, [enabled, opened, blinkSelect, select]);

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
