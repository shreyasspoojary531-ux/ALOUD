"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CustomModeSelect from "./CustomModeSelect";
import SettingsPopover from "./SettingsPopover";

function BackArrowIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

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

function ProfileIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function TopBar({ onHelp, spell = false, backTo = null }) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sequential drawer closure handlers
  const handleMobileHelp = () => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      onHelp?.();
    }, 180);
  };

  const handleMobileSettings = () => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      setSettingsOpen(true);
    }, 180);
  };

  const handleMobileProfile = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    setTimeout(() => {
      router.push("/profile");
    }, 180);
  };

  // Reusable Mobile Drawer component
  const mobileDrawerJSX = (
    <>
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
              onClick={handleMobileHelp}
            >
              ◯&nbsp; Help
            </button>
          )}

          <div style={{ position: "relative", width: "100%" }}>
            <button
              type="button"
              className={`pill drawer-pill-btn ${settingsOpen ? "active" : ""}`}
              onClick={handleMobileSettings}
              aria-label="Settings"
            >
              ⚙&nbsp; Settings
            </button>
            <SettingsPopover
              isOpen={settingsOpen}
              onClose={() => setSettingsOpen(false)}
            />
          </div>

          <a
            href="/profile"
            className="pill drawer-pill-btn profile-drawer-btn"
            onClick={handleMobileProfile}
          >
            <ProfileIcon /> Profile & Analytics
          </a>
        </div>
      </aside>
    </>
  );

  // Subpages with back button (Spell or Profile)
  if (backTo || spell) {
    return (
      <header className="spellbar">
        <Link href={backTo || "/home"} className="plain-back-btn" aria-label="Back">
          <BackArrowIcon />
        </Link>

        <h1>{spell ? "Spell it out" : "Profile & Analytics"}</h1>

        <div className="spellbar-right">
          {spell && (
            <div className="desktop-controls">
              <CustomModeSelect />
            </div>
          )}

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
        </div>

        {mobileDrawerJSX}
      </header>
    );
  }

  return (
    <header className="topbar">
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

      {mobileDrawerJSX}
    </header>
  );
}
