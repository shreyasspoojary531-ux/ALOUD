"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  adaptDwellBetweenSessions,
  getAdaptedDwell,
  resetAdaptiveDwell as resetAdaptiveDwellStorage,
  DEFAULT_DWELL,
} from "../../lib/adaptiveDwell";

const SettingsContext = createContext({
  voiceName: "",
  setVoiceName: () => {},
  repeatCount: 1,
  setRepeatCount: () => {},
  eyebrowShortcut: false,
  setEyebrowShortcut: () => {},
  customPhrases: [],
  addCustomPhrase: () => {},
  deleteCustomPhrase: () => {},
  adaptiveDwellEnabled: false,
  setAdaptiveDwellEnabled: () => {},
  adaptedDwellDuration: DEFAULT_DWELL,
  resetAdaptiveDwell: () => {},
});

export function SettingsProvider({ children }) {
  const [voiceName, setVoiceNameState] = useState("");
  const [repeatCount, setRepeatCountState] = useState(1);
  const [eyebrowShortcut, setEyebrowShortcutState] = useState(false);
  const [customPhrases, setCustomPhrasesState] = useState([]);
  const [adaptiveDwellEnabled, setAdaptiveDwellEnabledState] = useState(false);
  const [adaptedDwellDuration, setAdaptedDwellDuration] = useState(DEFAULT_DWELL);

  // Defer localStorage reads & run between-session adaptation on client hydration
  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem("aloud_voice_name");
      if (savedVoice) setVoiceNameState(savedVoice);

      const savedRepeat = localStorage.getItem("aloud_repeat_count");
      if (savedRepeat === "loop") {
        setRepeatCountState("loop");
      } else if (savedRepeat) {
        const parsed = parseInt(savedRepeat, 10);
        if ([1, 2, 3].includes(parsed)) setRepeatCountState(parsed);
      }

      const savedShortcut = localStorage.getItem("aloud_eyebrow_shortcut");
      if (savedShortcut === "true") {
        setEyebrowShortcutState(true);
      }

      const savedPhrases = localStorage.getItem("aloud_custom_phrases");
      if (savedPhrases) {
        const parsed = JSON.parse(savedPhrases);
        if (Array.isArray(parsed)) setCustomPhrasesState(parsed);
      }

      const savedAdaptive = localStorage.getItem("aloud_adaptive_dwell");
      if (savedAdaptive === "true") {
        setAdaptiveDwellEnabledState(true);
        // Calculate between-session dwell adaptation on app load
        const calculatedDwell = adaptDwellBetweenSessions();
        setAdaptedDwellDuration(calculatedDwell);
      } else {
        setAdaptedDwellDuration(DEFAULT_DWELL);
      }
    } catch (e) {}
  }, []);

  const setVoiceName = (name) => {
    setVoiceNameState(name);
    try { localStorage.setItem("aloud_voice_name", name); } catch (e) {}
  };

  const setRepeatCount = (n) => {
    setRepeatCountState(n);
    try { localStorage.setItem("aloud_repeat_count", String(n)); } catch (e) {}
  };

  const setEyebrowShortcut = (enabled) => {
    setEyebrowShortcutState(enabled);
    try { localStorage.setItem("aloud_eyebrow_shortcut", String(enabled)); } catch (e) {}
  };

  const setAdaptiveDwellEnabled = (enabled) => {
    setAdaptiveDwellEnabledState(enabled);
    try { localStorage.setItem("aloud_adaptive_dwell", String(enabled)); } catch (e) {}
    if (enabled) {
      const current = getAdaptedDwell();
      setAdaptedDwellDuration(current);
    } else {
      setAdaptedDwellDuration(DEFAULT_DWELL);
    }
  };

  const resetAdaptiveDwell = () => {
    resetAdaptiveDwellStorage();
    setAdaptedDwellDuration(DEFAULT_DWELL);
  };

  const addCustomPhrase = ({ text, category }) => {
    if (!text || !text.trim() || !category) return null;
    const newPhrase = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: text.trim(),
      category,
    };
    setCustomPhrasesState((prev) => {
      const next = [...prev, newPhrase];
      try { localStorage.setItem("aloud_custom_phrases", JSON.stringify(next)); } catch (e) {}
      return next;
    });
    return newPhrase;
  };

  const deleteCustomPhrase = (id) => {
    if (!id) return;
    setCustomPhrasesState((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try { localStorage.setItem("aloud_custom_phrases", JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        voiceName,
        setVoiceName,
        repeatCount,
        setRepeatCount,
        eyebrowShortcut,
        setEyebrowShortcut,
        customPhrases,
        addCustomPhrase,
        deleteCustomPhrase,
        adaptiveDwellEnabled,
        setAdaptiveDwellEnabled,
        adaptedDwellDuration,
        resetAdaptiveDwell,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
