"use server";

const MODEL_IDENTIFIER = "gemini-3.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IDENTIFIER}:generateContent`;

/**
 * Calls Gemini Flash-Lite REST API to produce up to 3 next-phrase completion suggestions.
 * Returns only continuation words.
 * Throws an explicit error if GEMINI_API_KEY is missing or if the API call fails.
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

  const prompt = `You are an AAC (augmentative communication) autocomplete engine.
The user has typed: "${message.trim()}"
Return up to 3 short continuations — ONLY the words that come AFTER what the user already typed.
Do NOT repeat the user's existing text. Do NOT return full sentences.
Example: if the user typed "i need", return ["some water", "help", "to rest"].
Keep each suggestion under 5 words.`;

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API request failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    const finishReason = data?.candidates?.[0]?.finishReason || "UNKNOWN";
    throw new Error(`Gemini API returned no text output (finishReason: ${finishReason})`);
  }

  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 3).map((item) => String(item).trim()).filter(Boolean);
    }
    throw new Error(`Parsed Gemini response was not an array: ${rawText}`);
  } catch (e) {
    console.error("[Gemini API] Failed to parse structured output:", rawText, e.message);
    throw new Error(`Failed to parse Gemini output: ${e.message}`);
  }
}
