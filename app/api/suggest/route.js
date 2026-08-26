import { NextResponse } from "next/server";
import { getSuggestions } from "../../../lib/gemini";

// In-memory minimum-interval guard (1.5 seconds).
// Note: In-memory state will not persist across serverless cold starts or multiple instances.
let lastRequestTime = 0;

export async function POST(request) {
  const now = Date.now();
  if (now - lastRequestTime < 1500) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before asking for suggestions again." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const message = body?.message || "";

    lastRequestTime = Date.now();

    const suggestions = await getSuggestions(message);
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.warn("[Suggest API Failure]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
