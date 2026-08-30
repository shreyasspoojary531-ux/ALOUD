"use client";
import { useEffect, useRef, useState } from "react";
import useScanner from "../scanner/useScanner";
import { cancelSpeech, isSpeechSupported, say } from "../../lib/speech";
import { useSettings } from "../shared/SettingsContext";
import { trackSpeechEvent } from "../../lib/analytics";

import { findBuiltinPhrase } from "../../lib/phrases";

export default function SpokenMessageOverlay({
  message,
  isEmergency,
  urgent,
  onDismiss,
  blinkSelect,
  repeatCount: repeatCountProp,
}) {
  const { repeatCount: ctxRepeat, telegramAlertMode: ctxAlertMode } = useSettings();
  // repeatCountProp takes precedence (passed from the page that calls say()),
  // falling back to context if not explicitly given.
  const repeat = repeatCountProp ?? ctxRepeat ?? 1;

  const dismissed = useRef(false);
  const [telegramStatus, setTelegramStatus] = useState(null);

  const handleDismiss = () => {
    dismissed.current = true;
    cancelSpeech();
    onDismiss?.();
  };

  const { active, select } = useScanner([{ label: "I got help" }], handleDismiss);

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
        // Auto-dismiss only if user hasn't already manually dismissed
        if (!dismissed.current) onDismiss?.();
      },
    });

    return () => {
      cancelSpeech();
    };
    // Re-run only when the message itself changes (new item selected).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  // Dispatch Telegram caregiver alert if configured and allowed by alert mode & emergency status
  useEffect(() => {
    if (typeof window === "undefined" || !message) return;

    const chatId = localStorage.getItem("aloud_caregiver_chat_id");
    const caregiverName = localStorage.getItem("aloud_caregiver_name") || "caregiver";
    const alertMode = ctxAlertMode || localStorage.getItem("aloud_telegram_alert_mode") || "emergency";

    if (!chatId) {
      setTelegramStatus(null);
      return;
    }

    // Determine if the message is emergency-level
    const isEmerg =
      isEmergency !== undefined
        ? !!isEmergency
        : findBuiltinPhrase(message)?.isEmergency ?? false;

    // Check routing decision
    const shouldSend = alertMode === "all" || (alertMode === "emergency" && isEmerg);

    if (!shouldSend) {
      setTelegramStatus(null);
      return;
    }

    setTelegramStatus({ type: "sending", text: `Sending Telegram alert to ${caregiverName}...` });

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
          setTelegramStatus({
            type: "sent",
            text: `✓ Telegram alert sent to ${caregiverName}`,
          });
        } else {
          setTelegramStatus({
            type: "failed",
            text: `✕ Telegram alert failed: ${data.error}`,
          });
        }
      })
      .catch((err) => {
        setTelegramStatus({
          type: "failed",
          text: `✕ Telegram alert failed: ${err.message || "Network error"}`,
        });
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
      <div className="overlay-content">
        <div className="dots">•••••</div>
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
        {telegramStatus && (
          <p
            className="speech-fallback-note"
            style={{
              fontWeight: 600,
              fontSize: "13px",
              marginTop: "4px",
              marginBottom: "12px",
              color:
                telegramStatus.type === "sent"
                  ? "#047857"
                  : telegramStatus.type === "failed"
                  ? "#b91c1c"
                  : "inherit",
            }}
          >
            {telegramStatus.text}
          </p>
        )}
        <button
          className={`button dark ${active === 0 ? "active" : ""}`}
          onClick={() => select(0)}
          aria-label="I got help"
        >
          ✓&nbsp; I got help
        </button>
        <p>
          This will keep playing until you long-blink again — or choose{" "}
          <b>I got help.</b>
        </p>
      </div>
    </section>
  );
}
