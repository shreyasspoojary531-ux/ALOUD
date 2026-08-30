"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "../../components/shared/TopBar";
import Button from "../../components/shared/Button";
import CustomPhrasesModal from "../../components/shared/CustomPhrasesModal";
import { useSettings } from "../../components/shared/SettingsContext";

function ProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function SettingsPage() {
  const {
    eyebrowShortcut,
    setEyebrowShortcut,
    adaptiveDwellEnabled,
    setAdaptiveDwellEnabled,
    adaptedDwellDuration,
    resetAdaptiveDwell,
    telegramAlertMode,
    setTelegramAlertMode,
  } = useSettings();

  const [customPhrasesOpen, setCustomPhrasesOpen] = useState(false);

  // Telegram Caregiver Alert State
  const [caregiverChatId, setCaregiverChatId] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [findLoading, setFindLoading] = useState(false);
  const [findError, setFindError] = useState(null);
  const [foundSenders, setFoundSenders] = useState(null);
  const [testStatus, setTestStatus] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCaregiverChatId(localStorage.getItem("aloud_caregiver_chat_id") || "");
      setCaregiverName(localStorage.getItem("aloud_caregiver_name") || "");
    }
  }, []);

  const handleFindCaregiver = async () => {
    setFindLoading(true);
    setFindError(null);
    setFoundSenders(null);

    try {
      const res = await fetch("/api/telegram/get-chat-id");
      const data = await res.json();
      setFindLoading(false);
      if (data.ok) {
        setFoundSenders(data.senders || []);
      } else {
        setFindError(data.error || "Failed to fetch updates from Telegram.");
      }
    } catch (err) {
      setFindLoading(false);
      setFindError(err.message || "Network error while looking for caregiver.");
    }
  };

  const handleSelectCaregiver = (sender) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("aloud_caregiver_chat_id", sender.chat_id);
      localStorage.setItem("aloud_caregiver_name", sender.name);
    }
    setCaregiverChatId(sender.chat_id);
    setCaregiverName(sender.name);
    setFoundSenders(null);
    setFindError(null);
  };

  const handleSendTestAlert = async () => {
    if (!caregiverChatId) return;
    setTestStatus({ loading: true, success: null, message: "Sending test alert to Telegram..." });

    try {
      const res = await fetch("/api/telegram/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: caregiverChatId,
          message: "🔔 Test Alert from Aloud: Caregiver notification setup successful!",
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setTestStatus({
          loading: false,
          success: true,
          message: "✓ Test alert sent successfully to Telegram!",
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: `✕ Telegram error: ${data.error}`,
        });
      }
    } catch (err) {
      setTestStatus({
        loading: false,
        success: false,
        message: `✕ Network error: ${err.message}`,
      });
    }
  };

  const handleClearCaregiver = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("aloud_caregiver_chat_id");
      localStorage.removeItem("aloud_caregiver_name");
    }
    setCaregiverChatId("");
    setCaregiverName("");
    setFoundSenders(null);
    setTestStatus(null);
    setFindError(null);
  };

  return (
    <main className="app">
      <TopBar backTo="/home" title="Settings" />

      <section className="settings-page-container center">
        <div className="settings-page-header">
          <p className="settings-page-subtitle">Configure caregiver alerts, gestures, and preferences</p>
        </div>

        <div className="settings-bento-grid">
          {/* Card 1 — Caregiver Alerts (Telegram) — Hero Bento Card */}
          <div className="settings-card bento-hero">
            <span className="settings-label">CAREGIVER ALERTS (TELEGRAM)</span>
            <p className="settings-hint" style={{ marginTop: "4px" }}>
              Send instant mobile notifications to a caregiver via Telegram when you speak or call for help.
            </p>

            <div className="telegram-link-wrap">
              <a
                href="https://t.me/Alouddd_bot?start=setup"
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary telegram-link-btn"
              >
                💬 Open @Alouddd_bot on Telegram
              </a>
              <p className="settings-hint" style={{ marginTop: "6px" }}>
                or search <strong>@Alouddd_bot</strong> on Telegram and send it any message.
              </p>
            </div>

            {/* Alert Routing Mode Control */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed var(--line)" }}>
              <span className="settings-label" style={{ fontSize: "11px", letterSpacing: "0.08em" }}>ALERT ROUTING MODE</span>
              <div className="repeat-control" role="group" aria-label="Caregiver alert mode" style={{ marginTop: "8px" }}>
                <button
                  type="button"
                  className={`repeat-btn${telegramAlertMode === "emergency" ? " repeat-btn--active" : ""}`}
                  onClick={() => setTelegramAlertMode("emergency")}
                  aria-pressed={telegramAlertMode === "emergency"}
                  style={{ fontSize: "12px", padding: "8px 12px" }}
                >
                  Emergency messages only
                </button>
                <button
                  type="button"
                  className={`repeat-btn${telegramAlertMode === "all" ? " repeat-btn--active" : ""}`}
                  onClick={() => setTelegramAlertMode("all")}
                  aria-pressed={telegramAlertMode === "all"}
                  style={{ fontSize: "12px", padding: "8px 12px" }}
                >
                  Send every message
                </button>
              </div>
              <p className="settings-hint" style={{ marginTop: "6px" }}>
                {telegramAlertMode === "all"
                  ? "Send every message notifies your caregiver every time you speak or type."
                  : "Emergency only sends alerts just for critical messages like 'I can't breathe', 'I'm in pain', or 'I need help'."}
              </p>
            </div>

            {/* Configured Caregiver Layout */}
            {caregiverChatId ? (
              <div className="caregiver-info-box" style={{ marginTop: "14px" }}>
                <div className="caregiver-detail-row">
                  <span className="caregiver-detail-label">Active Caregiver</span>
                  <span className="caregiver-detail-value">{caregiverName}</span>
                </div>
                <div className="caregiver-detail-row">
                  <span className="caregiver-detail-label">Telegram Chat ID</span>
                  <span className="caregiver-detail-value code-font">{caregiverChatId}</span>
                </div>

                <div className="caregiver-action-row">
                  <Button
                    className="secondary"
                    onSelect={handleSendTestAlert}
                    disabled={testStatus?.loading}
                  >
                    {testStatus?.loading ? "Sending..." : "🔔 Send test alert"}
                  </Button>

                  <Button
                    className="dark"
                    onSelect={handleClearCaregiver}
                  >
                    Clear caregiver
                  </Button>
                </div>

                {testStatus && (
                  <div
                    className={`telegram-status-pill ${
                      testStatus.success === true
                        ? "success"
                        : testStatus.success === false
                        ? "error"
                        : "info"
                    }`}
                  >
                    {testStatus.message}
                  </div>
                )}
              </div>
            ) : (
              /* Setup / Find Caregiver Layout */
              <div className="caregiver-info-box" style={{ marginTop: "14px" }}>
                <Button
                  className="secondary"
                  onSelect={handleFindCaregiver}
                  disabled={findLoading}
                >
                  {findLoading ? "Checking Telegram updates..." : "🔍 Find caregiver"}
                </Button>

                {findError && (
                  <div className="telegram-status-pill error">
                    {findError}
                  </div>
                )}

                {foundSenders !== null && (
                  <div className="telegram-senders-list">
                    {foundSenders.length === 0 ? (
                      <p className="settings-hint">
                        No one has messaged the bot yet. Open Telegram, send a message to <strong>@Alouddd_bot</strong>, and tap <strong>Find caregiver</strong> again.
                      </p>
                    ) : (
                      <>
                        <p className="settings-hint">Select your caregiver below:</p>
                        {foundSenders.map((sender) => (
                          <button
                            key={sender.chat_id}
                            type="button"
                            className="telegram-sender-btn"
                            onClick={() => handleSelectCaregiver(sender)}
                          >
                            <div>
                              <strong>{sender.name}</strong>
                              {sender.username && (
                                <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                                  {sender.username}
                                </span>
                              )}
                            </div>
                            <span className="select-arrow">Select →</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2 — Eyebrow Shortcut to Suggestions */}
          <div className="settings-card">
            <span className="settings-label">EYEBROW SHORTCUT TO SUGGESTIONS</span>
            <div className="repeat-control" role="group" aria-label="Eyebrow shortcut to suggestions" style={{ marginTop: "8px" }}>
              <button
                type="button"
                className={`repeat-btn${!eyebrowShortcut ? " repeat-btn--active" : ""}`}
                onClick={() => setEyebrowShortcut(false)}
                aria-pressed={!eyebrowShortcut}
              >
                Off
              </button>
              <button
                type="button"
                className={`repeat-btn${eyebrowShortcut ? " repeat-btn--active" : ""}`}
                onClick={() => setEyebrowShortcut(true)}
                aria-pressed={eyebrowShortcut}
              >
                On
              </button>
            </div>
            <p className="settings-hint" style={{ marginTop: "6px" }}>
              On Spell screen in Eye blink mode, raising your eyebrows jumps the cursor directly to suggestions.
            </p>
          </div>

          {/* Card 3 — Custom Phrases */}
          <div className="settings-card">
            <span className="settings-label">CUSTOM PHRASES</span>
            <div style={{ marginTop: "8px" }}>
              <Button
                className="secondary"
                onSelect={() => setCustomPhrasesOpen(true)}
              >
                ➕&nbsp; Manage custom phrases
              </Button>
            </div>
            <p className="settings-hint" style={{ marginTop: "6px" }}>
              Add your own custom phrases to category cards on the Home screen.
            </p>
          </div>

          {/* Card 4 — Adaptive Scan Speed */}
          <div className="settings-card">
            <span className="settings-label">ADAPTIVE SCAN SPEED</span>
            <div className="repeat-control" role="group" aria-label="Adaptive scan speed" style={{ marginTop: "8px" }}>
              <button
                type="button"
                className={`repeat-btn${!adaptiveDwellEnabled ? " repeat-btn--active" : ""}`}
                onClick={() => setAdaptiveDwellEnabled(false)}
                aria-pressed={!adaptiveDwellEnabled}
              >
                Off
              </button>
              <button
                type="button"
                className={`repeat-btn${adaptiveDwellEnabled ? " repeat-btn--active" : ""}`}
                onClick={() => setAdaptiveDwellEnabled(true)}
                aria-pressed={adaptiveDwellEnabled}
              >
                On
              </button>
            </div>
            <p className="settings-hint" style={{ marginTop: "6px" }}>
              {adaptiveDwellEnabled
                ? `Current pacing: ${adaptedDwellDuration}ms per item (adapted between sessions).`
                : "Automatically adjusts scan pacing between sessions based on usage."}
            </p>
            {adaptiveDwellEnabled && (
              <button
                type="button"
                className="reset-dwell-btn"
                onClick={resetAdaptiveDwell}
                aria-label="Reset to default speed"
              >
                ↺ Reset to default speed (1800ms)
              </button>
            )}
          </div>

          {/* Card 5 — Profile & Analytics Link */}
          <div className="settings-card">
            <span className="settings-label">ACCOUNT & ANALYTICS</span>
            <Link
              href="/profile"
              className="settings-profile-link"
              style={{ marginTop: "8px" }}
            >
              <div className="profile-link-content">
                <span className="profile-link-icon">
                  <ProfileIcon />
                </span>
                <div>
                  <strong>Profile & Analytics</strong>
                  <p>View your real speech metrics & activity history</p>
                </div>
              </div>
              <span className="profile-link-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <CustomPhrasesModal
        isOpen={customPhrasesOpen}
        onClose={() => setCustomPhrasesOpen(false)}
      />
    </main>
  );
}
