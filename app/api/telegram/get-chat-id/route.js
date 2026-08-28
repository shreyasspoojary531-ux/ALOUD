import { NextResponse } from "next/server";

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

    if (!data || !data.ok) {
      return NextResponse.json(
        { ok: false, error: data?.description || "Failed to fetch updates from Telegram." },
        { status: 500 }
      );
    }

    const updates = data.result || [];
    const sendersMap = new Map();

    // Collect unique senders from recent updates (messages or my_chat_member updates)
    for (const update of updates) {
      const msg = update.message || update.edited_message || update.channel_post;
      const from = msg?.from || update.my_chat_member?.from;
      const chatId = msg?.chat?.id || update.my_chat_member?.chat?.id;

      if (chatId && from) {
        const idStr = String(chatId);
        if (!sendersMap.has(idStr)) {
          const nameParts = [from.first_name, from.last_name].filter(Boolean);
          const fullName = nameParts.join(" ");
          const username = from.username ? `@${from.username}` : "";
          const displayName = fullName || username || `Chat ${idStr}`;

          sendersMap.set(idStr, {
            chat_id: idStr,
            name: displayName,
            username: from.username || null,
          });
        }
      }
    }

    const senders = Array.from(sendersMap.values());

    return NextResponse.json({ ok: true, senders });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to communicate with Telegram API." },
      { status: 500 }
    );
  }
}
