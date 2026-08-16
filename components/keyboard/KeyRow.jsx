"use client";
import { useEffect } from "react";
import useScanner from "../scanner/useScanner";

export default function KeyRow({
  row,
  active,
  onOpen,
  onKey,
  blinkSelect,
  opened,
  enabled = true,
}) {
  const { active: keyActive, select } = useScanner(
    row.keys,
    onKey,
    1800,
    enabled && active && opened
  );

  useEffect(() => {
    if (enabled && active && blinkSelect) {
      blinkSelect.current = () => (opened ? select() : onOpen());
    }
  }, [enabled, active, opened, blinkSelect, select, onOpen]);

  return (
    <div className={`keyboard-row ${active ? "active" : ""}`}>
      <div className="row-label">{row.label}</div>
      <div className="row-cells">
        {row.keys.map((key, i) => (
          <button
            key={key.label}
            className={`key ${key.kind || ""} ${opened && i === keyActive ? "active" : ""}`}
            onClick={() => (opened ? select(i) : onOpen())}
            aria-label={key.label}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
