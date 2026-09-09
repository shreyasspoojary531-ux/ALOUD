"use client";
import { useEffect, useRef, useState } from "react";
import useScanner from "../scanner/useScanner";
import { cancelSpeech, isSpeechSupported, say } from "../../lib/speech";
import { useSettings } from "../shared/SettingsContext";
import { trackSpeechEvent } from "../../lib/analytics";
import { findBuiltinPhrase } from "../../lib/phrases";
import TactileButton from "../shared/TactileButton";
import AlertPlayingIndicator from "./AlertPlayingIndicator";

// Toast auto-dismiss delay: 7.0 seconds (doubled for enhanced readability).
const TOAST_DURATION_MS = 7000;

function TelegramIcon({ className = "" }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`telegram-brand-icon ${className}`}
      aria-hidden="true"
    >
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// Maps Telegram status type → icon character for the toast.
const TOAST_ICONS = {
  sending: "⏳",
  sent: "✓",
  failed: "✕",
};

export default function SpokenMessageOverlay({
  message,
  isEmergency,
  urgent,
  onDismiss,
  blinkSelect,
  repeatCount: repeatCountProp,
  source = "home",
}) {
  const { repeatCount: ctxRepeat, telegramAlertMode: ctxAlertMode, addCustomPhrase } = useSettings();
  // repeatCountProp takes precedence (passed from the page that calls say()),
  // falling back to context if not explicitly given.
  const repeat = repeatCountProp ?? ctxRepeat ?? 1;

  const dismissed = useRef(false);

  // telegramStatus drives the toast: null = hidden, otherwise { type, text }.
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);
  const toastTimerRef = useRef(null);
  const toastExitTimerRef = useRef(null);

  const showToast = (status) => {
    setTelegramStatus(status);
    setToastVisible(true);
    setToastExiting(false);
    // Reset any running timers before starting a new one
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);

    // Only auto-dismiss on a final state (sent/failed), not while sending
    if (status.type !== "sending") {
      toastTimerRef.current = setTimeout(() => {
        setToastExiting(true);
        toastExitTimerRef.current = setTimeout(() => {
          setToastVisible(false);
          setToastExiting(false);
        }, 300);
      }, TOAST_DURATION_MS);
    }
  };

  // Clean up timers on unmount
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (toastExitTimerRef.current) clearTimeout(toastExitTimerRef.current);
  }, []);

  const handleDismiss = () => {
    dismissed.current = true;
    cancelSpeech();
    onDismiss?.();
  };

  const handleAddPhrase = () => {
    if (!message) return;
    const res = addCustomPhrase?.(message);
    if (res?.success) {
      showToast({ type: "sent", text: "✓ Saved to Custom Phrases" });
    } else if (res?.duplicate) {
      showToast({ type: "sent", text: "Already saved to Custom Phrases" });
    }
  };

  const isSpellSource = source === "spell";

  const overlayScannerItems = isSpellSource
    ? [{ label: "I got help" }, { label: "Add Phrase" }]
    : [{ label: "I got help" }];

  const handleAction = (item, index) => {
    if (index === 0 || item?.label === "I got help") {
      handleDismiss();
    } else if (index === 1 || item?.label === "Add Phrase") {
      handleAddPhrase();
    }
  };

  const { active, select } = useScanner(overlayScannerItems, handleAction);

  useEffect(() => {
    if (blinkSelect) {
      const prev = blinkSelect.current;
      blinkSelect.current = select;
      return () => {
        if (blinkSelect.current === select) {
          blinkSelect.current = prev;
        }
      };
    }
  }, [blinkSelect, select]);

  // Speak the message (with repeats). The overlay stays mounted for the full
  // repeat cycle — onEnd only fires after all repeats finish.
  useEffect(() => {
    dismissed.current = false;
    trackSpeechEvent({ text: message, repeatCount: repeat });
    say(message, {
      repeat,
      onEnd: () => {
        if (!dismissed.current) onDismiss?.();
      },
    });
    return () => { cancelSpeech(); };
    // Re-run only when the message itself changes (new item selected).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // Dispatch Telegram caregiver alert. Success/failure drives the toast — never
  // shows a success toast if the send actually failed.
  useEffect(() => {
    if (typeof window === "undefined" || !message) return;

    const chatId = localStorage.getItem("aloud_caregiver_chat_id");
    const caregiverName = localStorage.getItem("aloud_caregiver_name") || "caregiver";
    const alertMode = ctxAlertMode || localStorage.getItem("aloud_telegram_alert_mode") || "emergency";

    if (!chatId) {
      setTelegramStatus(null);
      setToastVisible(false);
      return;
    }

    const isEmerg =
      isEmergency !== undefined
        ? !!isEmergency
        : findBuiltinPhrase(message)?.isEmergency ?? false;

    const shouldSend = alertMode === "all" || (alertMode === "emergency" && isEmerg);

    if (!shouldSend) {
      setTelegramStatus(null);
      setToastVisible(false);
      return;
    }

    // Show "sending" immediately — auto-dismiss only fires after a final state
    showToast({ type: "sending", text: `Sending alert to ${caregiverName}…` });

    fetch("/api/telegram/send-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message: `🚨 ALERT from Aloud: "${message}"`,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          // Real send confirmed — show success toast
          showToast({ type: "sent", text: `Alert sent to ${caregiverName}` });
        } else {
          // API returned ok:false — honest failure toast, not a success
          showToast({ type: "failed", text: `Alert failed: ${data.error || "unknown error"}` });
        }
      })
      .catch((err) => {
        // Network-level failure — honest failure toast
        showToast({ type: "failed", text: `Alert failed: ${err.message || "Network error"}` });
      });
  }, [message, isEmergency, ctxAlertMode]);

  const speechAvailable = isSpeechSupported();

  return (
    <section
      className={`overlay ${urgent ? "alert" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Spoken Message"
    >
      {/* Toast — fixed top-right, pointer-events: none, never overlaps content */}
      {toastVisible && telegramStatus && (
        <div
          className={`alert-toast ${telegramStatus.type} ${toastExiting ? "exiting" : ""}`}
          role="status"
          aria-live="polite"
        >
          <TelegramIcon />
          <span className="alert-toast-icon" aria-hidden="true">
            {TOAST_ICONS[telegramStatus.type]}
          </span>
          <span className="toast-text-body">{telegramStatus.text}</span>
        </div>
      )}

      <div className="overlay-content">
        <div className="alert-orb-container">
          <AlertPlayingIndicator />
        </div>

        <div className="alert-text-container">
          <h1 className="spoken">{message}</h1>

          {!speechAvailable && (
            <p className="speech-fallback-note">
              (Speech audio unavailable in browser — message displayed as text)
            </p>
          )}

          {repeat === "loop" ? (
            <p className="repeat-indicator">Repeating until dismissed</p>
          ) : repeat > 1 ? (
            <p className="repeat-indicator">Repeating {repeat}×</p>
          ) : null}

          {/* "I got help" — restyled to match the TactileButton.terracotta used on
              the splash screen ("Begin with eye control"). Same component, same class.
              Selection behavior unchanged: active === 0 drives scan highlight,
              onClick calls select(0) which triggers handleDismiss via useScanner. */}
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", alignItems: "center", flexWrap: "wrap", margin: "16px 0" }}>
            <TactileButton
              className={`terracotta ${active === 0 ? "active" : ""}`}
              onSelect={() => select(0)}
              ariaLabel="I got help"
            >
              ✓&nbsp; I got help
            </TactileButton>

            {isSpellSource && (
              <TactileButton
                className={`secondary ${active === 1 ? "active" : ""}`}
                onSelect={() => select(1)}
                ariaLabel="Add Phrase"
              >
                +&nbsp; Add Phrase
              </TactileButton>
            )}
          </div>

          <p>
            This will keep playing until you long-blink again — or choose{" "}
            <b>I got help.</b>
          </p>
        </div>
      </div>
    </section>
  );
}
