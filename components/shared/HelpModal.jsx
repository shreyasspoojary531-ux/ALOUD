"use client";
import { useRouter } from "next/navigation";
import Button from "./Button";

export default function HelpModal({ onClose }) {
  const router = useRouter();

  const handleRecalibrate = () => {
    onClose?.();
    router.push("/setup");
  };

  return (
    <div className="help" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <div className="help-card">
        <div className="help-card-header">
          <h2 id="help-title">How Aloud Works</h2>
          <button
            type="button"
            className="help-close-btn"
            onClick={onClose}
            aria-label="Close help"
          >
            ✕
          </button>
        </div>

        <div className="help-steps">
          <div className="help-step">
            <span className="step-icon">◉</span>
            <div>
              <strong>Automatic Scanning</strong>
              <p>The orange scan highlight moves automatically through choices at a steady rhythm.</p>
            </div>
          </div>

          <div className="help-step">
            <span className="step-icon">◉̸</span>
            <div>
              <strong>Long Blink Select</strong>
              <p>Hold a relaxed long blink to choose the highlighted option. Mouse clicks and Spacebar work identically.</p>
            </div>
          </div>

          <div className="help-step">
            <span className="step-icon">⌗</span>
            <div>
              <strong>Build Your Message</strong>
              <p>Pick quick phrases from category cards or spell word-by-word on the keyboard screen.</p>
            </div>
          </div>

          <div className="help-step">
            <span className="step-icon">🔊</span>
            <div>
              <strong>Speak Aloud</strong>
              <p>Tap or select "Say it" to have your composed sentence spoken clearly out loud.</p>
            </div>
          </div>
        </div>

        <div className="help-card-actions">
          <Button className="cal-start-btn" onSelect={handleRecalibrate}>
            Recalibrate eyes
          </Button>
          <Button className="dark" onSelect={onClose}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
