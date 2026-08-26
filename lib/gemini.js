"use server";

const MODEL_IDENTIFIER = "gemini-3.6-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IDENTIFIER}:generateContent`;

/**
 * Calls Gemini Flash REST API to produce up to 3 next-phrase completion suggestions.
 * Returns only the continuation words (not the full sentence including the user's input).
 * Throws on missing API key or failed API call — never returns fake data.
 * @param {string} message - User's current in-progress message text
 * @returns {Promise<string[]>} Array of up to 3 completion strings
 */
export async function getSuggestions(message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }

  if (!message || !message.trim()) {
    return [];
  }

  // Prompt explicitly asks for ONLY continuation words, not the full sentence.
  // This matches the UI behavior: selecting a suggestion appends it to the current input.
  const prompt = `You are an AAC (augmentative communication) autocomplete engine.
The user has typed: "${message.trim()}"
Return up to 3 short continuations — ONLY the words that come AFTER what the user already typed.
Do NOT repeat the user's existing text. Do NOT return full sentences.
Example: if the user typed "i need", return ["some water", "help", "to rest"], NOT ["i need some water"].
Keep each suggestion under 5 words.`;

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
        // Structured output: forces valid JSON array of strings, no markdown/prose wrapping
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
        // Disable thinking for this simple completion task — reduces latency from ~5s to <1s.
        // thinkingBudget is documented on ThinkingConfig (inside generationConfig) for v1beta.
        // 0 = no internal reasoning, which is appropriate for short autocomplete.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  // With responseMimeType: "application/json" + responseSchema, Gemini returns valid JSON directly.
  // Parse is still wrapped in try/catch as a safety net against unexpected model output.
  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 3).map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (e) {
    console.warn("[Gemini] Failed to parse structured output:", rawText);
  }

  return [];
}
