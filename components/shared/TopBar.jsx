"use client";
import Link from "next/link";
import { useEyeControl } from "./EyeControlContext";

export default function TopBar({ onHelp, spell = false }) {
  const ctx = useEyeControl();

  const renderModeSelect = () => (
    <select
      className="pill eye-pill mode-select"
      value={ctx.mode}
      onChange={(e) => ctx.setMode(e.target.value)}
      aria-label="Control Input Mode"
    >
      <option value="blink">◉ Eye blink</option>
      <option value="eyebrow">▲ Eyebrow raise</option>
      <option value="palm">✋ Palm control</option>
      <option value="manual">⌨ Manual (mouse only)</option>
    </select>
  );

  return (
    <header className={spell ? "spellbar" : "topbar"}>
      {spell ? (
        <>
          <Link href="/home" className="pill">
            ‹&nbsp; Home
          </Link>
          <h1>Spell it out</h1>
          {renderModeSelect()}
        </>
      ) : (
        <>
          <Link href="/" className="brand">
            <i />
            Aloud
          </Link>
          <div className="controls">
            {renderModeSelect()}
            {onHelp && (
              <button type="button" className="pill" onClick={onHelp}>
                ◯&nbsp; Help
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}
