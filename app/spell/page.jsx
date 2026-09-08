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
  const [cursorPos, setCursorPos] = useState(0);

  // Keep cursorPos clamped to message length whenever message shrinks
  useEffect(() => {
    setCursorPos((p) => Math.min(p, message.length));
  }, [message.length]);
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

  const [aiSentences, setAiSentences] = useState([]);
  const [aiError, setAiError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const getSuggestionsRef = useRef(null);

  // Lazily load coreVocabulary when spell mode mounts (not on app init / home load)
  useEffect(() => {
    import("../../lib/coreVocabulary").then((mod) => {
      getSuggestionsRef.current = mod.getSuggestions;
      setSuggestions(mod.getSuggestions(message));
    });
  }, []);

  // Update suggestions synchronously when message changes
  useEffect(() => {
    if (getSuggestionsRef.current) {
      setSuggestions(getSuggestionsRef.current(message));
    }
  }, [message]);

  // Fetch AI sentence composition candidates when message contains fragmented keywords (>= 2 words)
  useEffect(() => {
    const trimmed = message.trim();
    const words = trimmed ? trimmed.split(/\s+/) : [];

    if (words.length < 2) {
      setAiSentences([]);
      setAiError(null);
      setIsGenerating(false);
      return;
    }

    let cancelled = false;
    setIsGenerating(true);
    setAiError(null);

    const timer = setTimeout(() => {
      fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          setIsGenerating(false);
          if (Array.isArray(data?.sentences) && data.sentences.length > 0) {
            setAiSentences(data.sentences);
            setAiError(null);
          } else if (data?.error) {
            setAiSentences([]);
            setAiError("AI unavailable");
          } else {
            setAiSentences([]);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setIsGenerating(false);
            setAiSentences([]);
            setAiError("AI unavailable");
          }
        });
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [message]);

  const keyboardRef = useRef(null);

  const handleEyebrowShortcut = useCallback(() => {
    // Jump scan highlight immediately to the shared suggestion row (index 0)
    keyboardRef.current?.jumpToSuggestions?.();
  }, []);

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p className="eyebrow">YOUR MESSAGE</p>
            {isGenerating ? (
              <span className="ai-status-pill generating">
                <span className="dot-wave">
                  <span />
                  <span />
                  <span />
                </span>
                Composing...
              </span>
            ) : aiError ? (
              <span className="ai-status-pill error">{aiError}</span>
            ) : null}
          </div>
          <div className={`message-line ${message ? "live" : ""}`}>
            {message ? (
              <>
                {message.slice(0, cursorPos)}
                <span className="text-cursor" aria-hidden="true" />
                {message.slice(cursorPos)}
              </>
            ) : (
              "Pick a suggestion, or spell a word."
            )}
          </div>
        </div>
        <Keyboard
          message={message}
          setMessage={setMessage}
          cursorPos={cursorPos}
          setCursorPos={setCursorPos}
          speak={speak}
          blinkSelect={blink}
          keyboardRef={keyboardRef}
          enabled={!spoken}
          suggestions={suggestions}
          aiSentences={aiSentences}
          isGenerating={isGenerating}
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
