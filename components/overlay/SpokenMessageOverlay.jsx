"use client";
import { useEffect, useRef, useState } from "react";
import useScanner from "../scanner/useScanner";
import { cancelSpeech, isSpeechSupported, say } from "../../lib/speech";
import { useSettings } from "../shared/SettingsContext";
import { trackSpeechEvent } from "../../lib/analytics";
import { findBuiltinPhrase } from "../../lib/phrases";
import TactileButton from "../shared/TactileButton";
import AlertPlayingIndicator from "./AlertPlayingIndicator";

// Toast auto-dismiss delay: 3.5 seconds (no prior toast pattern in the app).
const TOAST_DURATION_MS = 3500;

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
}) {
  const { repeatCount: ctxRepeat, telegramAlertMode: ctxAlertMode, addCustomPhrase } = useSettings();
  // repeatCountProp takes precedence (passed from the page that calls say()),
  // falling back to context if not explicitly given.
  const repeat = repeatCountProp ?? ctxRepeat ?? 1;

  const dismissed = useRef(false);

  // telegramStatus drives the toast: null = hidden, otherwise { type, text }.
  const [telegramStatus, setTelegramStatus] = useState(null);
  // toastVisible controls whether the toast is rendered — decoupled from
  // telegramStatus so the "sending" intermediate state can appear and then
  // auto-dismiss after TOAST_DURATION_MS once a final state is reached.
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef(null);

  const showToast = (status) => {
    setTelegramStatus(status);
    setToastVisible(true);
    // Reset any running timer before starting a new one
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    // Only auto-dismiss on a final state (sent/failed), not while sending
    if (status.type !== "sending") {
      toastTimerRef.current = setTimeout(() => setToastVisible(false), TOAST_DURATION_MS);
    }
  };

  // Clean up dismiss timer on unmount
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

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

  const overlayScannerItems = [
    { label: "I got help" },
    { label: "Add Phrase" },
  ];

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
          className={`alert-toast ${telegramStatus.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="alert-toast-icon" aria-hidden="true">
            {TOAST_ICONS[telegramStatus.type]}
          </span>
          {telegramStatus.text}
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

            <TactileButton
              className={`secondary ${active === 1 ? "active" : ""}`}
              onSelect={() => select(1)}
              ariaLabel="Add Phrase"
            >
              +&nbsp; Add Phrase
            </TactileButton>
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
