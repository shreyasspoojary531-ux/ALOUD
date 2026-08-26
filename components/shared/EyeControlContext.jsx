"use client";
import { createContext, useContext, useEffect, useState } from "react";

const EyeControlContext = createContext({
  mode: "blink",
  setMode: () => {},
  eyeOn: true,
  toggleEye: () => {},
  isPaused: false,
  setIsPaused: () => {},
});

export function EyeControlProvider({ children }) {
  // Deterministic initial state for Next.js SSR hydration match
  const [mode, setModeState] = useState("blink");
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aloud_control_mode");
      if (saved && ["blink", "eyebrow", "palm", "manual"].includes(saved)) {
        setModeState(saved);
      }
    } catch (e) {}
  }, []);

  const setMode = (newMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("aloud_control_mode", newMode);
    } catch (e) {}
  };

  const eyeOn = mode !== "manual";
  const toggleEye = () => {
    setMode(mode === "manual" ? "blink" : "manual");
  };

  return (
    <EyeControlContext.Provider
      value={{ mode, setMode, eyeOn, toggleEye, isPaused, setIsPaused }}
    >
      {children}
    </EyeControlContext.Provider>
  );
}

export function useEyeControl() {
  return useContext(EyeControlContext);
}
