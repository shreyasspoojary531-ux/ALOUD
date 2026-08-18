"use client";
import { useEffect, useRef, useState } from "react";
import { useEyeControl } from "./EyeControlContext";

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyebrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 9c0-3.3-2.7-6-6-6S6 5.7 6 9" />
      <path d="M7 6c1.5-1.5 3.5-2 5-2s3.5.5 5 2" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" />
      <path d="M10 17c1 1 3 1 4 0" />
    </svg>
  );
}

function PalmIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 11V6a2 2 0 0 0-4 0v3" />
      <path d="M14 9V4a2 2 0 0 0-4 0v5" />
      <path d="M10 9.5V5a2 2 0 0 0-4 0v8" />
      <path d="M18 11a2 2 0 0 1 4 0v4a8 8 0 0 1-8 8h-2c-2.8 0-4.5-1.2-6-3l-3.5-4.5a1.8 1.8 0 0 1 2.8-2.2L8 16" />
    </svg>
  );
}

function ManualIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
      <path d="M13 13l6 6" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const MODES = [
  { id: "blink", label: "Eye blink", icon: EyeIcon },
  { id: "eyebrow", label: "Eyebrow raise", icon: EyebrowIcon },
  { id: "palm", label: "Palm control", icon: PalmIcon },
  { id: "manual", label: "Manual (mouse only)", icon: ManualIcon },
];

export default function CustomModeSelect() {
  const { mode, setMode } = useEyeControl();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef(null);

  const activeModeObj = MODES.find((m) => m.id === mode) || MODES[0];
  const ActiveIcon = activeModeObj.icon;

  const toggleOpen = () => setOpen((prev) => !prev);

  const selectMode = (newModeId) => {
    setMode(newModeId);
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % MODES.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + MODES.length) % MODES.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectMode(MODES[focusedIndex].id);
    }
  };

  return (
    <div className="custom-mode-select" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        className="pill eye-pill mode-trigger-btn"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Control Input Mode"
      >
        <span className="mode-btn-icon">
          <ActiveIcon />
        </span>
        <span className="mode-btn-label">{activeModeObj.label}</span>
        <span className={`mode-chevron ${open ? "open" : ""}`}>
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <ul className="mode-dropdown-menu" role="listbox" tabIndex={-1}>
          {MODES.map((m, idx) => {
            const Icon = m.icon;
            const isSelected = m.id === mode;
            const isFocused = idx === focusedIndex;

            return (
              <li
                key={m.id}
                role="option"
                aria-selected={isSelected}
                className={`mode-option-item ${isSelected ? "selected" : ""} ${
                  isFocused ? "focused" : ""
                }`}
                onClick={() => selectMode(m.id)}
                onMouseEnter={() => setFocusedIndex(idx)}
              >
                <span className="option-icon">
                  <Icon />
                </span>
                <span className="option-label">{m.label}</span>
                {isSelected && <span className="option-check">✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
