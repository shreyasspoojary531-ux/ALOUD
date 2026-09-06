import { NextResponse } from "next/server";
import { composeSentences } from "../../../lib/gemini";

// In-memory minimum-interval rate limit guard (1.5 seconds)
let lastRequestTime = 0;

export async function POST(request) {
  const now = Date.now();
  if (now - lastRequestTime < 1500) {
    return NextResponse.json(
      { error: "AI unavailable", sentences: [] },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const message = body?.message || body?.keywords || "";

    if (!message || !message.trim()) {
      return NextResponse.json({ sentences: [] });
    }

    lastRequestTime = Date.now();

    const sentences = await composeSentences(message);
    return NextResponse.json({ sentences });
  } catch (error) {
    console.warn("[Sentence Compose API Failure]:", error.message);
    return NextResponse.json(
      { error: "AI unavailable", sentences: [] },
      { status: 500 }
    );
  }
}
