/**
 * Adaptive Scan Speed Engine for Aloud.
 * Completely separate, additive module managing between-session dwell duration adaptation.
 * Does not modify useScanner.js or default fixed scanner constants.
 */

export const DEFAULT_DWELL = 1800;
export const MIN_DWELL = 1200;
export const MAX_DWELL = 3200;

const STORAGE_KEY_ENABLED = "aloud_adaptive_dwell";
const STORAGE_KEY_DWELL = "aloud_adapted_dwell_ms";
const STORAGE_KEY_METRICS = "aloud_dwell_metrics";

/**
 * Get current dwell duration.
 * If adaptive mode is OFF, returns DEFAULT_DWELL (1800ms) with zero side effects.
 */
const isClient = () => typeof window !== "undefined" || typeof localStorage !== "undefined";

/**
 * Get current dwell duration.
 * If adaptive mode is OFF, returns DEFAULT_DWELL (1800ms) with zero side effects.
 */
export function getAdaptedDwell() {
  if (!isClient()) return DEFAULT_DWELL;
  try {
    const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
    if (!isEnabled) return DEFAULT_DWELL;

    const saved = localStorage.getItem(STORAGE_KEY_DWELL);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_DWELL && parsed <= MAX_DWELL) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_DWELL;
}

/**
 * Record a selection signal or correction signal in the current session buffer.
 * @param {boolean} isCorrection - true for correction/undo/back/clear; false for normal selection
 */
export function trackDwellSignal(isCorrection = false) {
  if (!isClient()) return;
  try {
    const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
    if (!isEnabled) return;

    const raw = localStorage.getItem(STORAGE_KEY_METRICS);
    const metrics = raw ? JSON.parse(raw) : { successes: 0, corrections: 0 };

    if (isCorrection) {
      metrics.corrections = (metrics.corrections || 0) + 1;
    } else {
      metrics.successes = (metrics.successes || 0) + 1;
    }

    localStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify(metrics));
  } catch (e) {}
}

/**
 * Calculate between-session dwell adaptation on app load based on previous session metrics.
 * Dwell pacing remains completely stable and fixed during any single active session.
 */
export function adaptDwellBetweenSessions() {
  if (!isClient()) return DEFAULT_DWELL;
  try {
    const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
    if (!isEnabled) return DEFAULT_DWELL;

    const currentDwell = getAdaptedDwell();
    const rawMetrics = localStorage.getItem(STORAGE_KEY_METRICS);
    if (!rawMetrics) return currentDwell;

    const metrics = JSON.parse(rawMetrics);
    const successes = Number(metrics.successes) || 0;
    const corrections = Number(metrics.corrections) || 0;
    const total = successes + corrections;

    let newDwell = currentDwell;

    // Adapt only if there was meaningful usage in the previous session (>= 4 total signals)
    if (total >= 4) {
      const correctionRate = corrections / total;

      if (correctionRate > 0.20) {
        // High correction rate: slow down quickly (+250ms) to assist struggling user
        newDwell = Math.min(MAX_DWELL, currentDwell + 250);
      } else if (correctionRate < 0.08) {
        // Low correction rate: speed up conservatively (-100ms)
        newDwell = Math.max(MIN_DWELL, currentDwell - 100);
      }
    }

    // Save adapted dwell and reset session metrics buffer for the new session
    localStorage.setItem(STORAGE_KEY_DWELL, String(newDwell));
    localStorage.setItem(STORAGE_KEY_METRICS, JSON.stringify({ successes: 0, corrections: 0 }));

    return newDwell;
  } catch (e) {
    return DEFAULT_DWELL;
  }
}

/**
 * Reset adaptive dwell data and revert to default 1800ms speed.
 */
export function resetAdaptiveDwell() {
  if (!isClient()) return DEFAULT_DWELL;
  try {
    localStorage.removeItem(STORAGE_KEY_DWELL);
    localStorage.removeItem(STORAGE_KEY_METRICS);
  } catch (e) {}
  return DEFAULT_DWELL;
}
