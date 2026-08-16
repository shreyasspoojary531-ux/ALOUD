"use client";
import Link from "next/link";
import { useEyeControl } from "./EyeControlContext";

export default function TopBar({ eyeOn: eyeOnProp, toggleEye: toggleEyeProp, onHelp, spell = false }) {
  const ctx = useEyeControl();
  const eyeOn = eyeOnProp ?? ctx.eyeOn;
  const toggleEye = toggleEyeProp ?? ctx.toggleEye;

  return (
    <header className={spell ? "spellbar" : "topbar"}>
      {spell ? (
        <>
          <Link href="/home" className="pill">
            ‹&nbsp; Home
          </Link>
          <h1>Spell it out</h1>
          <button className="pill eye-pill" onClick={toggleEye}>
            ◉&nbsp; Eye control {eyeOn ? "on" : "off"}
          </button>
        </>
      ) : (
        <>
          <Link href="/home" className="brand">
            <i />
            Aloud
          </Link>
          <div className="controls">
            <button className="pill eye-pill" onClick={toggleEye}>
              ◉&nbsp; Eye control {eyeOn ? "on" : "off"}
            </button>
            {onHelp && (
              <button className="pill" onClick={onHelp}>
                ◯&nbsp; Help
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}

