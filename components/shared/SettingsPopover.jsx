"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isSpeechSupported, cancelSpeech } from "../../lib/speech";
import { useSettings } from "./SettingsContext";

function ProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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

export default function SettingsPopover({ isOpen, onClose, onOpenCustomPhrases }) {
  const {
    voiceName,
    setVoiceName,
    repeatCount,
    setRepeatCount,
    eyebrowShortcut,
    setEyebrowShortcut,
    adaptiveDwellEnabled,
    setAdaptiveDwellEnabled,
    adaptedDwellDuration,
    resetAdaptiveDwell,
  } = useSettings();
  const voices = useVoices();
  const popoverRef = useRef(null);
  const previewRef = useRef(null);

  // Caregiver Telegram alert state stored in localStorage
  const [caregiverChatId, setCaregiverChatId] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [findLoading, setFindLoading] = useState(false);
  const [findError, setFindError] = useState(null);
  const [foundSenders, setFoundSenders] = useState(null);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCaregiverChatId(localStorage.getItem("aloud_caregiver_chat_id") || "");
      setCaregiverName(localStorage.getItem("aloud_caregiver_name") || "");
    }
  }, [isOpen]);

  const handleFindCaregiver = async () => {
    setFindLoading(true);
    setFindError(null);
    setFoundSenders(null);

    try {
      const res = await fetch("/api/telegram/get-chat-id");
      const data = await res.json();
      setFindLoading(false);
      if (data.ok) {
        setFoundSenders(data.senders || []);
      } else {
        setFindError(data.error || "Failed to fetch updates from Telegram.");
      }
    } catch (err) {
      setFindLoading(false);
      setFindError(err.message || "Network error while looking for caregiver.");
    }
  };

  const handleSelectCaregiver = (sender) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aloud_caregiver_chat_id", sender.chat_id);
      localStorage.setItem("aloud_caregiver_name", sender.name);
    }
    setCaregiverChatId(sender.chat_id);
    setCaregiverName(sender.name);
    setFoundSenders(null);
    setFindError(null);
  };

  const handleSendTestAlert = async () => {
    if (!caregiverChatId) return;
    setTestStatus({ loading: true, success: null, message: "Sending test alert to Telegram..." });

    try {
      const res = await fetch("/api/telegram/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: caregiverChatId,
          message: "🔔 Test Alert from Aloud: Caregiver notification setup successful!",
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setTestStatus({
          loading: false,
          success: true,
          message: "✓ Test alert sent successfully to Telegram!",
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: `✕ Telegram error: ${data.error}`,
        });
      }
    } catch (err) {
      setTestStatus({
        loading: false,
        success: false,
        message: `✕ Network error: ${err.message}`,
      });
    }
  };

  const handleClearCaregiver = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("aloud_caregiver_chat_id");
      localStorage.removeItem("aloud_caregiver_name");
    }
    setCaregiverChatId("");
    setCaregiverName("");
    setFoundSenders(null);
    setTestStatus(null);
    setFindError(null);
  };

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
    <div className="settings-popover-panel" ref={popoverRef} role="dialog" aria-label="Settings">
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

      {/* Setting 3 — Caregiver Alerts (Telegram) */}
      <section className="settings-section">
        <p className="settings-label">Caregiver Alerts (Telegram)</p>
        <div className="telegram-card">
          <p className="settings-hint">
            Send instant mobile alerts to a caregiver via Telegram when you trigger <strong>"call for help"</strong>.
          </p>

          <div>
            <a
              href="https://t.me/Alouddd_bot?start=setup"
              target="_blank"
              rel="noopener noreferrer"
              className="telegram-link"
            >
              💬 Open @Alouddd_bot on Telegram
            </a>
            <p className="settings-hint" style={{ marginTop: "4px" }}>
              or search <strong>@Alouddd_bot</strong> on Telegram and send it any message.
            </p>
          </div>

          {/* Configured Caregiver View */}
          {caregiverChatId ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink)" }}>
                Active Caregiver: <span style={{ color: "var(--orange-dark)" }}>{caregiverName}</span>
                <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>
                  Chat ID: {caregiverChatId}
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button secondary"
                  style={{ minHeight: "36px", padding: "0 12px", fontSize: "13px" }}
                  onClick={handleSendTestAlert}
                  disabled={testStatus?.loading}
                >
                  {testStatus?.loading ? "Sending..." : "🔔 Send test alert"}
                </button>
                <button
                  type="button"
                  className="reset-dwell-btn"
                  style={{ margin: 0 }}
                  onClick={handleClearCaregiver}
                >
                  Clear caregiver
                </button>
              </div>

              {testStatus && (
                <div
                  className={`telegram-status-pill ${
                    testStatus.success === true
                      ? "success"
                      : testStatus.success === false
                      ? "error"
                      : "info"
                  }`}
                >
                  {testStatus.message}
                </div>
              )}
            </div>
          ) : (
            /* Setup / Find Caregiver View */
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="button secondary"
                style={{ minHeight: "40px", padding: "0 14px", fontSize: "13px" }}
                onClick={handleFindCaregiver}
                disabled={findLoading}
              >
                {findLoading ? "Checking Telegram updates..." : "🔍 Find caregiver"}
              </button>

              {findError && (
                <div className="telegram-status-pill error">
                  {findError}
                </div>
              )}

              {foundSenders !== null && (
                <div className="telegram-senders-list">
                  {foundSenders.length === 0 ? (
                    <p className="settings-hint">
                      No one has messaged the bot yet. Open Telegram, send a message to <strong>@Alouddd_bot</strong>, and tap <strong>Find caregiver</strong> again.
                    </p>
                  ) : (
                    <>
                      <p className="settings-hint">Select your caregiver below:</p>
                      {foundSenders.map((sender) => (
                        <button
                          key={sender.chat_id}
                          type="button"
                          className="telegram-sender-btn"
                          onClick={() => handleSelectCaregiver(sender)}
                        >
                          <div>
                            <strong>{sender.name}</strong>
                            {sender.username && (
                              <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                                {sender.username}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "11px", color: "var(--orange-dark)", fontWeight: "bold" }}>
                            Select →
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Setting 3 — Eyebrow shortcut to suggestions */}
      <section className="settings-section">
        <p className="settings-label">Eyebrow shortcut to suggestions</p>
        <div className="repeat-control" role="group" aria-label="Eyebrow shortcut to suggestions">
          <button
            type="button"
            className={`repeat-btn${!eyebrowShortcut ? " repeat-btn--active" : ""}`}
            onClick={() => setEyebrowShortcut(false)}
            aria-pressed={!eyebrowShortcut}
          >
            Off
          </button>
          <button
            type="button"
            className={`repeat-btn${eyebrowShortcut ? " repeat-btn--active" : ""}`}
            onClick={() => setEyebrowShortcut(true)}
            aria-pressed={eyebrowShortcut}
          >
            On
          </button>
        </div>
        <p className="settings-hint">
          On Spell screen in Eye blink mode, raising your eyebrows jumps the cursor directly to suggestions.
        </p>
      </section>

      {/* Setting 4 — Custom Phrases */}
      <section className="settings-section">
        <p className="settings-label">Custom phrases</p>
        <button
          type="button"
          className="button secondary custom-phrases-open-btn"
          onClick={() => {
            onClose?.();
            onOpenCustomPhrases?.();
          }}
        >
          ➕&nbsp; Manage custom phrases
        </button>
        <p className="settings-hint">
          Add your own custom phrases to category cards.
        </p>
      </section>

      {/* Setting 5 — Adaptive scan speed */}
      <section className="settings-section">
        <p className="settings-label">Adaptive scan speed</p>
        <div className="repeat-control" role="group" aria-label="Adaptive scan speed">
          <button
            type="button"
            className={`repeat-btn${!adaptiveDwellEnabled ? " repeat-btn--active" : ""}`}
            onClick={() => setAdaptiveDwellEnabled(false)}
            aria-pressed={!adaptiveDwellEnabled}
          >
            Off
          </button>
          <button
            type="button"
            className={`repeat-btn${adaptiveDwellEnabled ? " repeat-btn--active" : ""}`}
            onClick={() => setAdaptiveDwellEnabled(true)}
            aria-pressed={adaptiveDwellEnabled}
          >
            On
          </button>
        </div>
        <p className="settings-hint">
          {adaptiveDwellEnabled
            ? `Current pacing: ${adaptedDwellDuration}ms per item (adapted between sessions).`
            : "Automatically adjusts scan pacing between sessions based on usage."}
        </p>
        {adaptiveDwellEnabled && (
          <button
            type="button"
            className="reset-dwell-btn"
            onClick={resetAdaptiveDwell}
            aria-label="Reset to default speed"
          >
            ↺ Reset to default speed (1800ms)
          </button>
        )}
      </section>

      {/* Setting 7 — Profile & Analytics */}
      <section className="settings-section">
        <p className="settings-label">Account & Analytics</p>
        <Link
          href="/profile"
          className="settings-profile-link"
          onClick={onClose}
        >
          <div className="profile-link-content">
            <span className="profile-link-icon">
              <ProfileIcon />
            </span>
            <div>
              <strong>Profile & Analytics</strong>
              <p>View your real speech metrics & history</p>
            </div>
          </div>
          <span className="profile-link-arrow">→</span>
        </Link>
      </section>
    </div>
  );
}
