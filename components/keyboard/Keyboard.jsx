"use client";
import { useEffect, useMemo, useState } from "react";
import useScanner from "../scanner/useScanner";
import KeyRow from "./KeyRow";

const letters = (s) => s.split("").map((label) => ({ label }));
const back = { label: "↵ back", kind: "back" };
const actions = [
  { label: "⌂ home" },
  { label: "◖ speak" },
  { label: "◯ rest" },
  { label: "↶ recent" },
  { label: "◔ speed" },
  { label: "♨ call for help", kind: "alert" },
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

  // SUGGESTIONS row is rebuilt whenever message or suggestions change,
  // so useScanner always sees the correct item list — no stale references.
  const suggestRow = useMemo(() => {
    const sayIt = {
      label: "📢 Say it",
      kind: hasMessage ? "say-it-compact" : "say-it-full",
    };
    const keys = hasMessage && suggestions.length > 0
      ? [sayIt, ...suggestions.map((t) => ({ label: t, kind: "suggest" })), back]
      : [sayIt, back];
    return { label: "SUGGEST", kind: "suggest-row", keys };
  }, [hasMessage, suggestions]);

  const rows = useMemo(() => [
    suggestRow,
    { label: "A–I", keys: letters("ABCDEFGHI").concat(back) },
    { label: "J–R", keys: letters("JKLMNOPQR").concat(back) },
    {
      label: "S–Z",
      keys: letters("STUVWXYZ").concat([
        { label: "⌴ space", kind: "wide" },
        back,
      ]),
    },
    {
      label: "EDIT",
      keys: [
        { label: "⌫ letter", kind: "wide" },
        { label: "◇ word", kind: "wide" },
        { label: "↶ undo", kind: "wide" },
        { label: "▱ clear", kind: "wide" },
        { label: "." },
        { label: "," },
        { label: "?" },
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
    if (key.label.includes("back")) return setOpened(null);
    if (key.label.includes("Say it") || key.label.includes("speak"))
      return speak(message);
    if (key.label.includes("home")) return location.assign("/home");
    if (key.label.includes("help")) return speak("I need help.", true);
    if (key.label.includes("clear")) return setMessage("");
    if (key.label.includes("letter")) return setMessage((m) => m.slice(0, -1));
    if (key.label.includes("word"))
      return setMessage((m) => m.trimEnd().replace(/\S+$/, ""));
    if (key.label === "⌴ space") return setMessage((m) => m + " ");
    if (/^[A-Z]$/.test(key.label))
      return setMessage((m) => m + key.label.toLowerCase());
    if ([".", ",", "?"].includes(key.label))
      return setMessage((m) => m + key.label);
    if (key.kind === "suggest") return setMessage(key.label);
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
