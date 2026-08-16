"use client";
import useScanner from "../scanner/useScanner";
import { cancelSpeech, isSpeechSupported } from "../../lib/speech";

export default function SpokenMessageOverlay({
  message,
  urgent,
  onDismiss,
  blinkSelect,
}) {
  const handleDismiss = () => {
    cancelSpeech();
    onDismiss?.();
  };

  const { active, select } = useScanner([{ label: "I got help" }], handleDismiss);

  if (blinkSelect) {
    blinkSelect.current = select;
  }

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
