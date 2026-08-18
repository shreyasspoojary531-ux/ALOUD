"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import CustomModeSelect from "./CustomModeSelect";
import SettingsPopover from "./SettingsPopover";

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function TopBar({ onHelp, spell = false, backTo = null, backLabel = null }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on ESC or route change
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

          {/* Desktop controls (≥900px) */}
          <div className="controls desktop-controls">
            <CustomModeSelect />
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

          {/* Mobile hamburger button (<900px) */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
          >
            <HamburgerIcon />
          </button>

          {/* Mobile Slide-in Drawer & Dimmed Backdrop */}
          {mobileMenuOpen && (
            <div
              className="mobile-drawer-backdrop"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          <aside className={`mobile-drawer-panel ${mobileMenuOpen ? "open" : ""}`} aria-label="Navigation menu">
            <div className="mobile-drawer-header">
              <span className="drawer-title">Menu</span>
              <button
                type="button"
                className="help-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="mobile-drawer-content">
              <div className="drawer-item">
                <span className="drawer-item-label">INPUT MODE</span>
                <CustomModeSelect />
              </div>

              {onHelp && (
                <button
                  type="button"
                  className="pill drawer-pill-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onHelp();
                  }}
                >
                  ◯&nbsp; Help
                </button>
              )}

              <div className="drawer-settings-wrapper" style={{ position: "relative", width: "100%" }}>
                <button
                  type="button"
                  className={`pill drawer-pill-btn ${settingsOpen ? "active" : ""}`}
                  onClick={() => setSettingsOpen((prev) => !prev)}
                  aria-label="Settings"
                >
                  ⚙&nbsp; Settings
                </button>
                <SettingsPopover
                  isOpen={settingsOpen}
                  onClose={() => setSettingsOpen(false)}
                />
              </div>

              <Link
                href="/profile"
                className="pill drawer-pill-btn profile-drawer-btn"
                onClick={() => setMobileMenuOpen(false)}
              >
                👤&nbsp; Profile & Analytics
              </Link>
            </div>
          </aside>
        </>
      )}
    </header>
  );
}
