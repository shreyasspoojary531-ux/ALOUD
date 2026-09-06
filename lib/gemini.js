"use server";

const MODEL_IDENTIFIER = "gemini-3.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_IDENTIFIER}:generateContent`;

/**
 * Calls Gemini Flash-Lite REST API to compose 1-3 natural first-person candidate sentences
 * from fragmented user keywords.
 * Throws an explicit error if GEMINI_API_KEY is missing or if the API call fails.
 * @param {string} keywords - User's selected/typed fragmented keywords.
 * @returns {Promise<string[]>} Array of candidate sentence strings.
 */
export async function composeSentences(keywords) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }

  if (!keywords || !keywords.trim()) {
    return [];
  }

  const prompt = `You are a sentence composition engine for a nonverbal AAC (augmentative and alternative communication) user.
The user selected the following fragmented keywords: "${keywords.trim()}".

Instructions:
1. Turn these fragmented keywords into complete, natural, first-person spoken sentences.
2. Return 1 to 3 candidate sentences ONLY if the keywords are genuinely ambiguous (i.e. could mean different plausible things). If unambiguous, return exactly 1 sentence.
3. Do NOT add extra politeness, information, or context the user did not provide (e.g. do not insert "please" or extra requests unless explicitly present in the input keywords).
4. Keep each sentence short, clear, and natural for spoken communication.
5. Return JSON matching the specified schema with a "sentences" array of strings.`;

  const response = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 250,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sentences: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["sentences"],
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
    if (parsed && Array.isArray(parsed.sentences)) {
      return parsed.sentences.slice(0, 3).map((item) => String(item).trim()).filter(Boolean);
    }
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 3).map((item) => String(item).trim()).filter(Boolean);
    }
    throw new Error(`Parsed Gemini response was not in expected shape: ${rawText}`);
  } catch (e) {
    console.error("[Gemini API] Failed to parse structured output:", rawText, e.message);
    throw new Error(`Failed to parse Gemini output: ${e.message}`);
  }
}
