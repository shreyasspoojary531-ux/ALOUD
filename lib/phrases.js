/**
 * Single source of truth for Aloud's built-in category phrases with explicit
 * emergency classifications (isEmergency: boolean).
 */

export const BUILTIN_PHRASES = [
  // I feel
  { text: "I’m in pain.", category: "I feel", isEmergency: true, icon: "pain" },
  { text: "I can’t breathe.", category: "I feel", isEmergency: true, icon: "breathe" },
  { text: "I feel sick.", category: "I feel", isEmergency: true, icon: "sick" },
  { text: "I’m too hot.", category: "I feel", isEmergency: false, icon: "hot" },
  { text: "I’m too cold.", category: "I feel", isEmergency: false, icon: "cold" },
  { text: "I’m itchy.", category: "I feel", isEmergency: false, icon: "sick" },

  // I need
  { text: "I need help.", category: "I need", isEmergency: true, icon: "help" },
  { text: "I need medicine.", category: "I need", isEmergency: true, icon: "medicine" },
  { text: "I need some water.", category: "I need", isEmergency: false, icon: "droplet" },
  { text: "I need the bathroom.", category: "I need", isEmergency: false, icon: "help" },
  { text: "I need to rest.", category: "I need", isEmergency: false, icon: "rest" },
  { text: "I need my family.", category: "I need", isEmergency: false, icon: "users" },

  // People
  { text: "Please call someone.", category: "People", isEmergency: true, icon: "message" },
  { text: "I need my carer.", category: "People", isEmergency: false, icon: "users" },
  { text: "I want company.", category: "People", isEmergency: false, icon: "users" },

  // Answers
  { text: "Yes.", category: "Answers", isEmergency: false, icon: "yes" },
  { text: "No.", category: "Answers", isEmergency: false, icon: "no" },
  { text: "Maybe.", category: "Answers", isEmergency: false, icon: "question" },
  { text: "I don’t know.", category: "Answers", isEmergency: false, icon: "question" },
  { text: "Thank you.", category: "Answers", isEmergency: false, icon: "heart" },
  { text: "Please.", category: "Answers", isEmergency: false, icon: "hand" },
];

/**
  Helper to find built-in phrase definition by exact text match
 */
export function findBuiltinPhrase(text) {
  if (!text) return null;
  return BUILTIN_PHRASES.find((p) => p.text.trim().toLowerCase() === text.trim().toLowerCase()) || null;
}
