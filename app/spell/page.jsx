"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "../../components/shared/TopBar";
import CameraPill from "../../components/camera/CameraPill";
import Keyboard from "../../components/keyboard/Keyboard";
import SpokenMessageOverlay from "../../components/overlay/SpokenMessageOverlay";
import { useEyeControl } from "../../components/shared/EyeControlContext";
import { say } from "../../lib/speech";

export default function Spell() {
  const { eyeOn, toggleEye } = useEyeControl();
  const [message, setMessage] = useState("");
  const [spoken, setSpoken] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const blink = useRef(() => {});
  const onBlink = useCallback(() => blink.current(undefined, { isBlink: true }), []);

  // Fetch AI suggestions whenever message changes; silently fail on error.
  useEffect(() => {
    if (!message.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    })
      .then((r) => r.json())
      .then(({ suggestions: s }) => {
        if (!cancelled) setSuggestions(s ?? []);
      })
      .catch(() => {}); // never block typing on a failed AI call
    return () => { cancelled = true; };
  }, [message]);

  const speak = (text, urgent = false) => {
    if (!text) return;
    say(text);
    setSpoken({ text, urgent });
  };

  return (
    <main className="app">
      <section className="spell center">
        <TopBar spell eyeOn={eyeOn} toggleEye={toggleEye} />
        <div className="spell-message">
          <p className="eyebrow">YOUR MESSAGE</p>
          <div className={`message-line ${message ? "live" : ""}`}>
            {message || "Pick a suggestion, or spell a word."}
          </div>
        </div>
        <Keyboard
          message={message}
          setMessage={setMessage}
          speak={speak}
          blinkSelect={blink}
          enabled={!spoken}
          suggestions={suggestions}
        />
      </section>
      <p className="caption">
        A row is highlighting — <b>long-blink</b> to open it
      </p>
      <CameraPill enabled={eyeOn} onLongBlink={onBlink} />
      {spoken && (
        <SpokenMessageOverlay
          message={spoken.text}
          urgent={spoken.urgent}
          blinkSelect={blink}
          onDismiss={() => setSpoken(null)}
        />
      )}
    </main>
  );
}

