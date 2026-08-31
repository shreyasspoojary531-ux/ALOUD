import { NextResponse } from "next/server";
import { processTelegramUpdate, getCachedSenders } from "../../../../lib/telegram";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN environment variable is not configured." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (data && data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        await processTelegramUpdate(update, token);
      }
    }

    const senders = getCachedSenders();

    return NextResponse.json({ ok: true, senders });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to communicate with Telegram API." },
      { status: 500 }
    );
  }
}

