"use client";
import { useEffect } from "react";
import useScanner from "../scanner/useScanner";
import ScanRing from "../scanner/ScanRing";
import Icon from "../shared/Icon";
import { useEyeControl } from "../shared/EyeControlContext";

export default function KeyRow({
  row,
  active,
  onOpen,
  onKey,
  blinkSelect,
  opened,
  enabled = true,
}) {
  const { eyeOn } = useEyeControl();

  const { active: keyActive, select, selectedIndex, captureOnset } = useScanner(
    row.keys,
    onKey,
    1800,
    enabled && active && opened
  );

  useEffect(() => {
    if (enabled && active && blinkSelect) {
      blinkSelect.current = {
        onLongBlink: (index, options) =>
          opened ? select(index, { isBlink: true, ...options }) : onOpen(),
        onBlinkOnset: () => {
          if (opened) captureOnset();
        },
      };
    }
  }, [enabled, active, opened, blinkSelect, select, captureOnset, onOpen]);

  const handleKeyClick = (key, i, e) => {
    if (eyeOn) {
      e?.preventDefault();
      return;
    }
    if (opened) {
      select(i, { isPointer: true });
    } else {
      onOpen();
    }
  };

  const totalCols = row.cols || row.keys.reduce((acc, k) => acc + (k.colSpan || 1), 0);

  return (
    <div
      className={`keyboard-row ${active ? "active" : ""} ${opened ? "opened" : ""}`}
      onClick={(e) => {
        if (!opened && !eyeOn) {
          onOpen();
        }
      }}
    >
      <div className="row-label">{row.label}</div>
      <div
        className="row-cells"
        style={{ gridTemplateColumns: `repeat(${totalCols}, 1fr)` }}
      >
        {row.keys.map((key, i) => {
          const isKeyActive = opened && i === keyActive;
          const isKeySelected = opened && i === selectedIndex;
          const colStyle = key.colSpan ? { gridColumn: `span ${key.colSpan}` } : {};

          return (
            <button
              key={key.label + i}
              className={`key ${key.kind || ""} ${isKeyActive ? "active" : ""} ${isKeySelected ? "selected-lift" : ""}`}
              style={colStyle}
              onClick={(e) => handleKeyClick(key, i, e)}
              aria-label={key.label}
            >
              <ScanRing active={enabled && active && isKeyActive} selected={isKeySelected} duration={1800} />
              {key.icon && (
                <span className="key-icon">
                  <Icon name={key.icon} />
                </span>
              )}
              <span className="key-label">{key.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
