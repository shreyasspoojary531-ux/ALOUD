/**
 * Web Speech API wrapper for Aloud.
 * Fixes Desktop Chrome & Brave Speech Synthesis bugs:
 * - Retains V8 GC reference (activeUtterance) so Chrome Desktop doesn't drop audio mid-session
 * - Handles Chromium IPC cancel() race condition with a 15ms buffer
 * - Dynamic voice selection & fallback
 * - Runtime 1.2s onstart verification for Brave Shields block detection
 * - Sentence chunking for long utterances (>120 chars)
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
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
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

export function say(text, callbacks = {}) {
  if (!isSpeechSupported() || !text) {
    callbacks.onError?.(new Error("Speech synthesis unsupported or empty text"));
    return false;
  }

  const chunks = splitTextIntoChunks(text);
  let currentChunkIndex = 0;

  const playChunk = (index) => {
    if (index >= chunks.length) {
      activeUtterance = null;
      callbacks.onEnd?.();
      return;
    }

    const chunkText = chunks[index];

    try {
      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.rate = 0.95;

      // Retain reference in module scope so V8 GC does not sweep it mid-speech
      activeUtterance = utterance;

      // Voice selection
      const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const englishVoice =
          voices.find((v) => v.lang && v.lang.startsWith("en") && v.localService !== false) ||
          voices.find((v) => v.lang && v.lang.startsWith("en"));
        if (englishVoice) utterance.voice = englishVoice;
      }

      let hasStarted = false;
      let startTimer = null;

      utterance.onstart = () => {
        hasStarted = true;
        if (startTimer) clearTimeout(startTimer);
        if (index === 0) callbacks.onStart?.();
      };

      utterance.onend = () => {
        if (startTimer) clearTimeout(startTimer);
        playChunk(index + 1);
      };

      utterance.onerror = (e) => {
        if (startTimer) clearTimeout(startTimer);
        console.warn(`[Speech Error] Chunk ${index + 1}/${chunks.length} error type:`, e.error, e);
        
        // If utterance was canceled intentionally, don't trigger blocked warning
        if (e.error !== "interrupted" && e.error !== "canceled") {
          callbacks.onError?.(e);
        }
      };

      // Brave Shields / Privacy Block Runtime Detection
      startTimer = setTimeout(() => {
        if (!hasStarted && (!window.speechSynthesis.speaking || window.speechSynthesis.paused)) {
          console.warn(
            "[Speech] Utterance failed to start within 1.2s threshold (Brave Shields / Privacy Blocked)"
          );
          callbacks.onBlocked?.(
            "Speech may be blocked by your browser's privacy settings — try lowering Shields for this site"
          );
        }
      }, 1200);

      // Chromium IPC cancel() buffer handling
      const shouldBuffer = window.speechSynthesis.speaking || window.speechSynthesis.pending;
      if (shouldBuffer && index === 0) {
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
  return true;
}
