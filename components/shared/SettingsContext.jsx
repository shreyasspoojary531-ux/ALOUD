"use client";
import { createContext, useContext, useEffect, useState } from "react";

const SettingsContext = createContext({
  voiceName: "",
  setVoiceName: () => {},
  repeatCount: 1,
  setRepeatCount: () => {},
});

export function SettingsProvider({ children }) {
  const [voiceName, setVoiceNameState] = useState("");
  const [repeatCount, setRepeatCountState] = useState(1);

  // Defer localStorage reads to after client hydration (same pattern as EyeControlContext)
  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem("aloud_voice_name");
      if (savedVoice) setVoiceNameState(savedVoice);

      const savedRepeat = parseInt(localStorage.getItem("aloud_repeat_count") || "1", 10);
      if ([1, 2, 3].includes(savedRepeat)) setRepeatCountState(savedRepeat);
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

  return (
    <SettingsContext.Provider value={{ voiceName, setVoiceName, repeatCount, setRepeatCount }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
