/**
 * Analytics event tracking engine for Aloud.
 * Tracks real speech events persistently in localStorage under `aloud_analytics_events`.
 */

const STORAGE_KEY = "aloud_analytics_events";

/**
 * Record a spoken message event.
 * @param {Object} event
 * @param {string} event.text - Spoken phrase/message
 * @param {'category' | 'suggestion' | 'spelled' | 'action'} event.source - Source of speech
 * @param {number} event.repeatCount - Number of times message was configured to repeat
 */
export function trackSpeechEvent({ text, source = "category", repeatCount = 1 }) {
  if (typeof window === "undefined" || !text) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const events = raw ? JSON.parse(raw) : [];

    const newEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      source,
      repeatCount: Number(repeatCount) || 1,
    };

    events.push(newEvent);

    // Keep up to 1000 recent events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.warn("[Analytics] Failed to track speech event:", e);
  }
}

/**
 * Compute aggregate summary statistics from stored speech events.
 */
export function getAnalyticsSummary() {
  let events = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      events = raw ? JSON.parse(raw) : [];
    } catch (e) {
      events = [];
    }
  }

  if (events.length === 0) {
    return {
      totalMessages: 0,
      topPhrases: [],
      repeatDistribution: { 1: 0, 2: 0, 3: 0 },
      dailyBreakdown: [],
    };
  }

  const phraseCounts = {};
  const repeatCounts = { 1: 0, 2: 0, 3: 0 };
  const dayCounts = {};

  for (const evt of events) {
    // Phrase frequency
    const key = evt.text;
    phraseCounts[key] = (phraseCounts[key] || 0) + 1;

    // Repeat count distribution
    const r = evt.repeatCount || 1;
    repeatCounts[r] = (repeatCounts[r] || 0) + 1;

    // Daily breakdown (YYYY-MM-DD)
    const dateStr = evt.timestamp ? evt.timestamp.split("T")[0] : "Today";
    dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
  }

  // Sort top phrases by count
  const topPhrases = Object.entries(phraseCounts)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Daily breakdown array sorted chronologically
  const dailyBreakdown = Object.entries(dayCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalMessages: events.length,
    topPhrases,
    repeatDistribution: repeatCounts,
    dailyBreakdown,
  };
}

/**
 * Clear all stored analytics events.
 */
export function clearAnalyticsData() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
