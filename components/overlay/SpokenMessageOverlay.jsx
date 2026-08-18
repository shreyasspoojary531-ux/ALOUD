"use client";
import { useEffect, useRef } from "react";
import useScanner from "../scanner/useScanner";
import { cancelSpeech, isSpeechSupported, say } from "../../lib/speech";
import { useSettings } from "../shared/SettingsContext";
import { trackSpeechEvent } from "../../lib/analytics";

export default function SpokenMessageOverlay({
  message,
  urgent,
  onDismiss,
  blinkSelect,
  repeatCount: repeatCountProp,
}) {
  const { repeatCount: ctxRepeat } = useSettings();
  // repeatCountProp takes precedence (passed from the page that calls say()),
  // falling back to context if not explicitly given.
  const repeat = repeatCountProp ?? ctxRepeat ?? 1;

  const dismissed = useRef(false);

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
        {repeat > 1 && (
          <p className="repeat-indicator">
            Repeating {repeat}×
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
