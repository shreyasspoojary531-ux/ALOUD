/**
 * Web Speech API wrapper for Aloud.
 * Fixes Desktop Chrome & Brave Speech Synthesis bugs:
 * - Retains V8 GC reference (activeUtterance) so Chrome Desktop doesn't drop audio mid-session
 * - Handles Chromium IPC cancel() race condition with a 15ms buffer
 * - Dynamic voice selection respecting user-saved preference (SettingsContext / localStorage)
 * - Runtime 1.2s onstart verification for Brave Shields block detection
 * - Sentence chunking for long utterances (>120 chars)
 * - repeat option: plays message N times with a 400ms pause between repeats
 */

let cachedVoices = [];
let activeUtterance = null; // Global V8 GC reference retention

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const updateVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      cachedVoices = [];
    }
  };
  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;

  // Unmute audio context on first user click or key press (Chromium/Brave requirement)
  const unlockAudio = () => {
    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch (e) {}
    window.removeEventListener("click", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("click", unlockAudio);
  window.addEventListener("keydown", unlockAudio);
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelSpeech() {
  if (isSpeechSupported()) {
    try {
      activeUtterance = null;
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

/** Returns the currently configured voice, falling back to English local, then any English. */
function resolveVoice() {
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prefer the user-saved name stored in localStorage
  try {
    const savedName = localStorage.getItem("aloud_voice_name");
    if (savedName) {
      const match = voices.find((v) => v.name === savedName);
      if (match) return match;
    }
  } catch (e) {}

  // Fallback: local English voice, then any English
  return (
    voices.find((v) => v.lang?.startsWith("en") && v.localService !== false) ||
    voices.find((v) => v.lang?.startsWith("en"))
  );
}

/**
 * Splits long text into chunks to prevent Chrome's 15s audio cutoff bug.
 */
function splitTextIntoChunks(text, maxLength = 120) {
  if (!text || text.length <= maxLength) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

/**
 * Speak `text`, optionally repeating up to `repeat` times with a 400ms pause between plays.
 * callbacks:
 *   onStart()   — fires when the first word of the first play begins
 *   onEnd()     — fires after all repeats are fully done
 *   onError(e)  — fires on non-cancel errors
 *   onBlocked(msg) — fires when speech fails to start within 1.2s (Brave Shields block)
 */
export function say(text, callbacks = {}) {
  if (!isSpeechSupported() || !text) {
    callbacks.onError?.(new Error("Speech synthesis unsupported or empty text"));
    return false;
  }

  const repeatTotal = Math.max(1, callbacks.repeat ?? 1);
  let repeatsDone = 0;

  const playRepeat = () => {
    const chunks = splitTextIntoChunks(text);
    let chunkIndex = 0;

    const playChunk = (index) => {
      if (index >= chunks.length) {
        // All chunks of this repeat done
        repeatsDone += 1;
        if (repeatsDone < repeatTotal) {
          // Pause 400ms then play again
          setTimeout(playRepeat, 400);
        } else {
          activeUtterance = null;
          callbacks.onEnd?.();
        }
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = 0.95;
        utterance.voice = resolveVoice();

        // Retain reference in module scope so V8 GC does not sweep it mid-speech
        activeUtterance = utterance;

        let hasStarted = false;
        let startTimer = null;

        utterance.onstart = () => {
          hasStarted = true;
          if (startTimer) clearTimeout(startTimer);
          // Fire onStart only once — at the very first chunk of the very first repeat
          if (index === 0 && repeatsDone === 0) callbacks.onStart?.();
        };

        utterance.onend = () => {
          if (startTimer) clearTimeout(startTimer);
          playChunk(index + 1);
        };

        utterance.onerror = (e) => {
          if (startTimer) clearTimeout(startTimer);
          console.warn(`[Speech Error] Chunk ${index + 1}/${chunks.length} (repeat ${repeatsDone + 1}/${repeatTotal}):`, e.error, e);
          if (e.error !== "interrupted" && e.error !== "canceled") {
            callbacks.onError?.(e);
          }
        };

        // Brave Shields runtime block detection — only on first chunk of first repeat
        if (index === 0 && repeatsDone === 0) {
          startTimer = setTimeout(() => {
            if (!hasStarted && (!window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
              console.warn("[Speech] Failed to start within 1.2s (Brave Shields block?)");
              callbacks.onBlocked?.(
                "Speech may be blocked by your browser's privacy settings — try lowering Shields for this site"
              );
            }
          }, 1200);
        }

        // Chromium IPC cancel() buffer: only on the very first utterance to avoid cancelling repeats
        const shouldBuffer =
          index === 0 && repeatsDone === 0 &&
          (window.speechSynthesis.speaking || window.speechSynthesis.pending);

        if (shouldBuffer) {
          window.speechSynthesis.cancel();
          setTimeout(() => {
            if (window.speechSynthesis.paused) window.speechSynthesis.resume();
            window.speechSynthesis.speak(utterance);
          }, 15);
        } else {
          if (window.speechSynthesis.paused) window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        console.error("[Speech] Exception during speak:", err);
        callbacks.onError?.(err);
      }
    };

    playChunk(0);
  };

  playRepeat();
  return true;
}
