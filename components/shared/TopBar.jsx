"use client";
import { useState } from "react";
import Link from "next/link";
import CustomModeSelect from "./CustomModeSelect";
import SettingsPopover from "./SettingsPopover";

function ProfileIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function TopBar({ onHelp, spell = false, backTo = null, backLabel = null }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className={spell ? "spellbar" : "topbar"}>
      {backTo ? (
        <>
          <Link href={backTo} className="pill">
            ‹&nbsp; {backLabel || "Back"}
          </Link>
          <h1>{spell ? "Spell it out" : "Profile & Analytics"}</h1>
          <CustomModeSelect />
        </>
      ) : spell ? (
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
            <Link href="/profile" className="pill profile-pill" aria-label="Profile">
              <ProfileIcon /> Profile
            </Link>
            {onHelp && (
              <button type="button" className="pill" onClick={onHelp}>
                ◯&nbsp; Help
              </button>
            )}
            <div className="settings-popover-wrapper" style={{ position: "relative" }}>
              <button
                type="button"
                className={`pill ${settingsOpen ? "active" : ""}`}
                onClick={() => setSettingsOpen((prev) => !prev)}
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                aria-label="Settings"
              >
                ⚙&nbsp; Settings
              </button>
              <SettingsPopover
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
