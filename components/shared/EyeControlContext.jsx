"use client";
import { createContext, useContext, useState } from "react";

const EyeControlContext = createContext({
  eyeOn: true,
  setEyeOn: () => {},
  toggleEye: () => {},
});

export function EyeControlProvider({ children }) {
  const [eyeOn, setEyeOn] = useState(true);
  const toggleEye = () => setEyeOn((prev) => !prev);

  return (
    <EyeControlContext.Provider value={{ eyeOn, setEyeOn, toggleEye }}>
      {children}
    </EyeControlContext.Provider>
  );
}

export function useEyeControl() {
  return useContext(EyeControlContext);
}
