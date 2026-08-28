import { NextResponse } from "next/server";

export async function POST(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN environment variable is not configured." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { chat_id, message } = body || {};

  if (!chat_id || !String(chat_id).trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing required parameter: chat_id." },
      { status: 400 }
    );
  }

  const alertText = message && String(message).trim()
    ? String(message).trim()
    : "🚨 Caregiver Alert from Aloud!";

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chat_id).trim(),
        text: alertText,
      }),
    });

    const data = await res.json();

    if (!data || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: data?.description || `Telegram API error (${res.status}).`,
        },
        { status: res.status >= 400 && res.status < 600 ? res.status : 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message_id: data.result?.message_id,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to communicate with Telegram API." },
      { status: 500 }
    );
  }
}
