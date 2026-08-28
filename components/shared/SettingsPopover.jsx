"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isSpeechSupported, cancelSpeech } from "../../lib/speech";
import { useSettings } from "./SettingsContext";

/** Returns the live voice list, updating when voiceschanged fires. */
function useVoices() {
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    if (!isSpeechSupported()) return;

    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoices(v);
    };

    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  return voices;
}

const PREVIEW_TEXT = "Hello. I am ready to speak for you.";
const REPEAT_OPTIONS = [
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
  { value: "loop", label: "Until dismissed" },
];

export default function SettingsPopover({ isOpen, onClose }) {
  const { voiceName, setVoiceName, repeatCount, setRepeatCount } = useSettings();
  const voices = useVoices();
  const popoverRef = useRef(null);
  const previewRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose?.();
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Stop preview when popover closes
  useEffect(() => () => cancelSpeech(), []);

  if (!isOpen) return null;

  // Default to first English local voice if nothing saved yet
  const activeVoice = voiceName
    ? voices.find((v) => v.name === voiceName)
    : voices.find((v) => v.lang?.startsWith("en") && v.localService !== false) ||
      voices.find((v) => v.lang?.startsWith("en"));

  const previewVoice = (voice) => {
    if (!isSpeechSupported()) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(PREVIEW_TEXT);
    utt.voice = voice;
    utt.rate = 0.95;
    previewRef.current = utt; // retain ref so V8 GC doesn't drop it
    window.speechSynthesis.speak(utt);
  };

  const sortedVoices = [
    ...voices.filter((v) => v.lang?.startsWith("en")),
    ...voices.filter((v) => !v.lang?.startsWith("en")),
  ];

  return (
    <div className="settings-popover-panel" ref={popoverRef} role="dialog" aria-label="Quick Settings">
      <div className="settings-popover-header">
        <h3>Settings</h3>
        <button
          type="button"
          className="help-close-btn"
          onClick={onClose}
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      {/* Setting 1 — Voice selection */}
      <section className="settings-section">
        <p className="settings-label">Voice</p>
        {voices.length === 0 ? (
          <p className="settings-hint">No voices available in this browser.</p>
        ) : (
          <ul className="voice-list" role="listbox" aria-label="Select voice">
            {sortedVoices.map((v) => {
              const selected = activeVoice?.name === v.name;
              return (
                <li
                  key={v.name}
                  className={`voice-item${selected ? " voice-item--selected" : ""}`}
                  role="option"
                  aria-selected={selected}
                >
                  <button
                    type="button"
                    className="voice-pick-btn"
                    onClick={() => setVoiceName(v.name)}
                    aria-label={`Select voice ${v.name}`}
                  >
                    <span className="voice-name">{v.name}</span>
                    <span className="voice-lang">{v.lang}</span>
                  </button>
                  <button
                    type="button"
                    className="voice-preview-btn"
                    onClick={() => previewVoice(v)}
                    aria-label={`Preview voice ${v.name}`}
                  >
                    ▶
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Setting 2 — Repeat count */}
      <section className="settings-section">
        <p className="settings-label">Repeat message</p>
        <div className="repeat-control" role="group" aria-label="Repeat count">
          {REPEAT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`repeat-btn${repeatCount === value ? " repeat-btn--active" : ""}`}
              onClick={() => setRepeatCount(value)}
              aria-pressed={repeatCount === value}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="settings-hint">
          How many times the message repeats before closing.
        </p>
      </section>

      {/* Navigation — Link to Full Settings Page */}
      <section className="settings-section" style={{ paddingTop: "4px" }}>
        <Link
          href="/settings"
          className="settings-more-btn"
          onClick={onClose}
        >
          <span>More Settings</span>
          <span>→</span>
        </Link>
      </section>
    </div>
  );
}
