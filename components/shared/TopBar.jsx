"use client";
import Link from "next/link";
import CustomModeSelect from "./CustomModeSelect";

export default function TopBar({ onHelp, onSettings, spell = false }) {
  return (
    <header className={spell ? "spellbar" : "topbar"}>
      {spell ? (
        <>
          <Link href="/home" className="pill">
            ‹&nbsp; Home
          </Link>
          <h1>Spell it out</h1>
          <CustomModeSelect />
        </>
      ) : (
        <>
          <Link href="/" className="brand">
            <i />
            Aloud
          </Link>
          <div className="controls">
            <CustomModeSelect />
            {onHelp && (
              <button type="button" className="pill" onClick={onHelp}>
                ◯&nbsp; Help
              </button>
            )}
            {onSettings && (
              <button type="button" className="pill" onClick={onSettings} aria-label="Settings">
                ⚙&nbsp; Settings
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}
