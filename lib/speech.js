/**
 * Web Speech API wrapper for Aloud.
 * SpeechSynthesisUtterance with voice loading, cancellation, and event callbacks.
 */

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function cancelSpeech() {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function say(text, callbacks = {}) {
  if (!isSpeechSupported()) {
    callbacks.onError?.(new Error("Speech synthesis unsupported"));
    return false;
  }

  // Cancel active speech to avoid overlapping utterances
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95; // Slightly clear and deliberate speed

  const setVoiceAndSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Prefer an English voice if available
      const englishVoice = voices.find((v) => v.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;
    }

    utterance.onstart = () => callbacks.onStart?.();
    utterance.onend = () => callbacks.onEnd?.();
    utterance.onerror = (e) => callbacks.onError?.(e);

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      callbacks.onError?.(err);
    }
  };

  // Handle async voice loading in some browsers
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      setVoiceAndSpeak();
    };
    // Speak anyway immediately in case voiceschanged does not fire
    setVoiceAndSpeak();
  } else {
    setVoiceAndSpeak();
  }

  return true;
}
