"use client";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "./SettingsContext";

const CATEGORIES = ["I feel", "I need", "People", "Answers"];

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function CustomPhrasesModal({ isOpen, onClose }) {
  const { customPhrases, addCustomPhrase, deleteCustomPhrase } = useSettings();
  const [text, setText] = useState("");
  const [category, setCategory] = useState("I need");
  const [isEmergency, setIsEmergency] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const modalRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose?.();
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Close custom dropdown when clicking outside dropdown element
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleDropdownOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDropdownOutside);
    return () => document.removeEventListener("mousedown", handleDropdownOutside);
  }, [dropdownOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    addCustomPhrase({ text, category, isEmergency });
    setText("");
    setIsEmergency(false);
  };

  return (
    <>
      <div className="mobile-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="settings-popover-panel custom-phrases-modal"
        ref={modalRef}
        role="dialog"
        aria-label="Custom Phrases"
      >
        <div className="settings-popover-header">
          <h3>Custom Phrases</h3>
          <button
            type="button"
            className="help-close-btn"
            onClick={onClose}
            aria-label="Close custom phrases modal"
          >
            ✕
          </button>
        </div>

        {/* Form: Add New Custom Phrase */}
        <section className="settings-section">
          <p className="settings-label">Add a new phrase</p>
          <form onSubmit={handleSubmit} className="custom-phrase-form">
            <input
              type="text"
              className="custom-phrase-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. I want to sit outside"
              aria-label="New phrase text"
              autoFocus
            />

            <div className="custom-phrase-form-row" style={{ marginTop: "10px" }}>
              {/* Custom-styled Category Selector Dropdown matching CustomModeSelect pattern */}
              <div className="custom-category-select-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className="custom-category-trigger-btn"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  aria-label="Select category"
                >
                  <span>{category}</span>
                  <ChevronDownIcon />
                </button>

                {dropdownOpen && (
                  <ul className="custom-category-dropdown-list" role="listbox">
                    {CATEGORIES.map((cat) => (
                      <li key={cat} role="option" aria-selected={category === cat}>
                        <button
                          type="button"
                          className={`custom-category-option-btn${
                            category === cat ? " active" : ""
                          }`}
                          onClick={() => {
                            setCategory(cat);
                            setDropdownOpen(false);
                          }}
                        >
                          {cat}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button type="submit" className="button primary save-phrase-btn">
                Save phrase
              </button>
            </div>

            {/* Emergency Phrase Checkbox Toggle */}
            <label className="custom-phrase-emergency-toggle" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", cursor: "pointer", fontSize: "13px", color: "var(--ink)", fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "var(--salmon)" }}
              />
              <span>Mark as emergency phrase 🚨</span>
            </label>
          </form>
        </section>

        {/* List: Existing Custom Phrases Grouped by Category */}
        <section className="settings-section custom-phrases-list-section">
          <p className="settings-label">Your saved phrases</p>
          {customPhrases.length === 0 ? (
            <p className="settings-hint">
              No custom phrases saved yet. Add one above to see it in your category grid!
            </p>
          ) : (
            CATEGORIES.map((cat) => {
              const catPhrases = customPhrases.filter((p) => p.category === cat);
              if (catPhrases.length === 0) return null;

              return (
                <div key={cat} className="custom-phrase-group">
                  <p className="custom-phrase-group-title">{cat.toUpperCase()}</p>
                  <ul className="custom-phrase-items">
                    {catPhrases.map((p) => (
                      <li key={p.id} className="custom-phrase-item">
                        <span className="custom-phrase-item-text">
                          {p.text}
                          {p.isEmergency && (
                            <span style={{ marginLeft: "8px", fontSize: "11px", padding: "2px 6px", borderRadius: "999px", background: "rgba(224, 90, 71, 0.15)", color: "var(--salmon)", fontWeight: 600 }}>
                              🚨 Emergency
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="custom-phrase-delete-btn"
                          onClick={() => deleteCustomPhrase(p.id)}
                          aria-label={`Delete custom phrase ${p.text}`}
                        >
                          <TrashIcon />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
