"use client";
import { useEffect, useRef, useState } from "react";
import { isSpeechSupported, cancelSpeech } from "../../lib/speech";
import { useSettings } from "./SettingsContext";
import Button from "./Button";

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
];

export default function SettingsModal({ onClose }) {
  const { voiceName, setVoiceName, repeatCount, setRepeatCount } = useSettings();
  const voices = useVoices();
  const previewRef = useRef(null); // holds active preview utterance for V8 GC retention

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

  // Stop preview when modal closes
  useEffect(() => () => cancelSpeech(), []);

  // Show English voices first, then others
  const sortedVoices = [
    ...voices.filter((v) => v.lang?.startsWith("en")),
    ...voices.filter((v) => !v.lang?.startsWith("en")),
  ];

  return (
    <div className="help" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="help-card settings-card">
        <div className="help-card-header">
          <h2 id="settings-title">Settings</h2>
          <button
            type="button"
            className="help-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        {/* Setting 1 — Voice */}
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
            How many times the message is spoken before the overlay closes.
          </p>
        </section>

        <div className="help-card-actions">
          <Button className="dark" onSelect={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
