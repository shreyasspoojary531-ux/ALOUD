/**
 * Web Speech API wrapper for Aloud.
 * Handles voice pre-caching, synchronous execution inside user gestures,
 * cancelation/resumption, and diagnostic logging.
 */

let cachedVoices = [];

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

  // Unmute audio context on first user click or key press (Chromium/Brave Desktop requirement)
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
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

export function say(text, callbacks = {}) {
  if (!isSpeechSupported() || !text) {
    callbacks.onError?.(new Error("Speech synthesis unsupported or empty text"));
    return false;
  }

  try {
    // 1. Cancel previous utterance
    window.speechSynthesis.cancel();

    // 2. Ensure engine is unpaused (fixes Chrome/Brave/Safari freeze issue)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;

    // Pick English voice if cached and available locally
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const englishVoice = voices.find((v) => v.lang && v.lang.startsWith("en") && v.localService !== false) || voices.find((v) => v.lang && v.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      callbacks.onStart?.();
    };

    utterance.onend = () => {
      callbacks.onEnd?.();
    };

    utterance.onerror = (e) => {
      console.warn("[Speech] Utterance error:", e);
      callbacks.onError?.(e);
    };

    // 3. Speak synchronously inside user event handler
    window.speechSynthesis.speak(utterance);

    // Chrome/Brave bug workaround: resume speechSynthesis if stuck pending
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    return true;
  } catch (err) {
    console.error("[Speech] Exception during speak:", err);
    callbacks.onError?.(err);
    return false;
  }
}
