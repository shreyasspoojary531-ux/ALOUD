"use client";
import { useCallback, useEffect, useState } from "react";
import TopBar from "../../components/shared/TopBar";
import Button from "../../components/shared/Button";
import { getAnalyticsSummary, clearAnalyticsData } from "../../lib/analytics";

export default function ProfilePage() {
  const [summary, setSummary] = useState(null);

  const refreshSummary = useCallback(() => {
    setSummary(getAnalyticsSummary());
  }, []);

  useEffect(() => {
    refreshSummary();
  }, [refreshSummary]);

  const handleClearData = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Are you sure you want to clear all speech analytics history? This cannot be undone."
      );
      if (confirmed) {
        clearAnalyticsData();
        refreshSummary();
      }
    }
  };

  if (!summary) return null;

  const { totalMessages, topPhrases, repeatDistribution, dailyBreakdown } = summary;
  const isEmpty = totalMessages === 0;

  // Compute repeat percentages
  const r1 = repeatDistribution[1] || 0;
  const r2 = repeatDistribution[2] || 0;
  const r3 = repeatDistribution[3] || 0;
  const rTotal = r1 + r2 + r3 || 1;

  const pct1 = Math.round((r1 / rTotal) * 100);
  const pct2 = Math.round((r2 / rTotal) * 100);
  const pct3 = Math.round((r3 / rTotal) * 100);

  return (
    <main className="app">
      <TopBar backTo="/home" backLabel="Home" />

      <section className="profile-container center">
        <div className="profile-header-card">
          <div className="profile-avatar-pill">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h1 className="profile-name">User Profile</h1>
            <p className="profile-subtitle">Communication activity & speech metrics</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="analytics-empty-card">
            <span className="empty-icon">📊</span>
            <h2>No activity yet</h2>
            <p>
              Phrases and words you speak using eye control, long blinks, or typing will appear here as real-time communication statistics.
            </p>
          </div>
        ) : (
          <div className="analytics-grid">
            {/* Stat Card 1 — Total Messages */}
            <div className="analytics-card stat-hero">
              <span className="stat-label">TOTAL MESSAGES SPOKEN</span>
              <span className="stat-value">{totalMessages}</span>
              <span className="stat-caption">Recorded live in your browser</span>
            </div>

            {/* Stat Card 2 — Repeat Count Usage */}
            <div className="analytics-card">
              <span className="stat-label">REPEAT COUNT DISTRIBUTION</span>
              <div className="repeat-bars-list">
                <div className="repeat-bar-row">
                  <span className="repeat-bar-label">1× Single play</span>
                  <div className="repeat-bar-track">
                    <div className="repeat-bar-fill r1" style={{ width: `${pct1}%` }} />
                  </div>
                  <span className="repeat-bar-val">{r1} ({pct1}%)</span>
                </div>
                <div className="repeat-bar-row">
                  <span className="repeat-bar-label">2× Repeat</span>
                  <div className="repeat-bar-track">
                    <div className="repeat-bar-fill r2" style={{ width: `${pct2}%` }} />
                  </div>
                  <span className="repeat-bar-val">{r2} ({pct2}%)</span>
                </div>
                <div className="repeat-bar-row">
                  <span className="repeat-bar-label">3× Repeat</span>
                  <div className="repeat-bar-track">
                    <div className="repeat-bar-fill r3" style={{ width: `${pct3}%` }} />
                  </div>
                  <span className="repeat-bar-val">{r3} ({pct3}%)</span>
                </div>
              </div>
            </div>

            {/* Stat Card 3 — Top Phrases */}
            <div className="analytics-card full-width">
              <span className="stat-label">MOST FREQUENTLY SPOKEN</span>
              <ul className="top-phrases-list">
                {topPhrases.map(({ text, count }, idx) => {
                  const maxCount = topPhrases[0]?.count || 1;
                  const widthPct = Math.max(12, Math.round((count / maxCount) * 100));
                  return (
                    <li key={idx} className="phrase-item">
                      <div className="phrase-info">
                        <span className="phrase-rank">#{idx + 1}</span>
                        <span className="phrase-text">"{text}"</span>
                        <span className="phrase-count">{count} {count === 1 ? "time" : "times"}</span>
                      </div>
                      <div className="phrase-bar-track">
                        <div className="phrase-bar-fill" style={{ width: `${widthPct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Stat Card 4 — Daily Breakdown */}
            {dailyBreakdown.length > 0 && (
              <div className="analytics-card full-width">
                <span className="stat-label">DAILY ACTIVITY LOG</span>
                <div className="daily-list">
                  {dailyBreakdown.map(({ date, count }) => (
                    <div key={date} className="daily-item">
                      <span className="daily-date">{date}</span>
                      <span className="daily-count">{count} messages</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Data Section */}
            <div className="profile-actions-card full-width">
              <div>
                <strong>Clear Analytics History</strong>
                <p>Delete all recorded speech events from your browser storage.</p>
              </div>
              <Button className="dark alert-btn" onSelect={handleClearData}>
                Clear data
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
