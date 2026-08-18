"use client";
import { createContext, useContext, useEffect, useState } from "react";

const EyeControlContext = createContext({
  mode: "blink",
  setMode: () => {},
  eyeOn: true,
  setEyeOn: () => {},
  toggleEye: () => {},
});

export function EyeControlProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      return (
        (typeof window !== "undefined" &&
          localStorage.getItem("aloud_control_mode")) ||
        "blink"
      );
    } catch (e) {
      return "blink";
    }
  });

  const setMode = (newMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("aloud_control_mode", newMode);
    } catch (e) {}
  };

  const eyeOn = mode !== "manual";
  const setEyeOn = (on) => {
    setMode(on ? "blink" : "manual");
  };
  const toggleEye = () => {
    setMode(mode === "manual" ? "blink" : "manual");
  };

  return (
    <EyeControlContext.Provider
      value={{ mode, setMode, eyeOn, setEyeOn, toggleEye }}
    >
      {children}
    </EyeControlContext.Provider>
  );
}

export function useEyeControl() {
  return useContext(EyeControlContext);
}
