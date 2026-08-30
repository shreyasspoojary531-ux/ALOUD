"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "../../components/shared/TopBar";
import CameraPill from "../../components/camera/CameraPill";
import Keyboard from "../../components/keyboard/Keyboard";
import SpokenMessageOverlay from "../../components/overlay/SpokenMessageOverlay";
import { useEyeControl } from "../../components/shared/EyeControlContext";
import { useSettings } from "../../components/shared/SettingsContext";
import { BUILTIN_PHRASES, findBuiltinPhrase } from "../../lib/phrases";

export default function Spell() {
  const { eyeOn } = useEyeControl();
  const { repeatCount, adaptedDwellDuration } = useSettings();
  const [message, setMessage] = useState("");
  const [spoken, setSpoken] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const blink = useRef(null);
  const onBlink = useCallback((...args) => {
    if (typeof blink.current === "function") {
      blink.current(...args);
    } else if (blink.current?.onLongBlink) {
      blink.current.onLongBlink(...args);
    }
  }, []);

  const onBlinkOnset = useCallback(() => {
    if (blink.current?.onBlinkOnset) {
      blink.current.onBlinkOnset();
    }
  }, []);

  // Fetch AI suggestions when message changes with a 600ms debounce.
  // Errors or rate limits (429/500) will NOT wipe out existing suggestions.
  useEffect(() => {
    if (!message.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data?.suggestions)) {
            setSuggestions(data.suggestions);
          }
        })
        .catch(() => {}); // never block typing on a failed AI call
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [message]);

  const keyboardRef = useRef(null);

  const handleEyebrowShortcut = useCallback(() => {
    // Only jump to suggestions if suggestions are currently loaded and available
    if (suggestions && suggestions.length > 0) {
      keyboardRef.current?.jumpToSuggestions?.();
    }
  }, [suggestions]);

  // SpokenMessageOverlay now calls say() internally with repeat count
  const speak = (text, isEmergencyFlag = false) => {
    if (!text) return;
    const isEmerg = isEmergencyFlag || findBuiltinPhrase(text)?.isEmergency || false;
    setSpoken({ text, isEmergency: isEmerg });
  };

  return (
    <main className="app">
      <section className="spell center">
        <TopBar spell />
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
          keyboardRef={keyboardRef}
          enabled={!spoken}
          suggestions={suggestions}
          interval={adaptedDwellDuration}
        />
      </section>
      <p className="caption">
        A row is highlighting — <b>long-blink</b> to open it
      </p>
      <CameraPill
        enabled={eyeOn}
        onLongBlink={onBlink}
        onBlinkOnset={onBlinkOnset}
        onEyebrowShortcut={handleEyebrowShortcut}
      />
      {spoken && (
        <SpokenMessageOverlay
          message={spoken.text}
          isEmergency={spoken.isEmergency}
          repeatCount={repeatCount}
          urgent={spoken.isEmergency}
          blinkSelect={blink}
          onDismiss={() => setSpoken(null)}
        />
      )}
    </main>
  );
}
