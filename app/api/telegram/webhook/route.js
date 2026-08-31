import { NextResponse } from "next/server";
import { processTelegramUpdate } from "../../../../lib/telegram";

export async function POST(req) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN environment variable is not configured." },
      { status: 500 }
    );
  }

  try {
    const update = await req.json();
    await processTelegramUpdate(update, token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to process Telegram webhook update." },
      { status: 500 }
    );
  }
}
