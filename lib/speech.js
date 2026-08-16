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
    // 2. Ensure engine is unpaused (fixes Chrome/Safari freeze issue)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;

    // Pick English voice if cached
    const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const englishVoice = voices.find((v) => v.lang && v.lang.startsWith("en"));
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

    if (process.env.NODE_ENV === "development") {
      console.log(`[Speech] Pre-speak -> speaking: ${window.speechSynthesis.speaking}, pending: ${window.speechSynthesis.pending}`);
    }

    // 3. Speak synchronously inside user event handler
    window.speechSynthesis.speak(utterance);

    if (process.env.NODE_ENV === "development") {
      console.log(`[Speech] Post-speak -> speaking: ${window.speechSynthesis.speaking}, pending: ${window.speechSynthesis.pending}`);
    }

    return true;
  } catch (err) {
    console.error("[Speech] Exception during speak:", err);
    callbacks.onError?.(err);
    return false;
  }
}
