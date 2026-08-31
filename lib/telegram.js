// Server-side helper for Telegram updates and command responses
const cachedSenders = new Map();
const repliedUpdates = new Set();

export const COMMAND_RESPONSES = {
  START: "You're connected. This account will now receive alerts from Aloud when the patient needs your attention. Go back to the Aloud app and tap 'Find caregiver' in Settings to finish linking.",
  HELP: "Aloud is an eye-controlled augmentative communication app. This bot sends instant alerts to caregivers when urgent messages or help calls are spoken. All configuration happens inside the Aloud app Settings.",
  STOP: "You have requested to stop receiving alerts. Note: To completely disconnect, the patient/user must also tap 'Clear caregiver' in their Aloud app Settings.",
};

/**
 * Processes a single Telegram update: caches sender info and replies to /start, /help, /stop.
 */
export async function processTelegramUpdate(update, token) {
  if (!update || typeof update !== "object") return null;

  const updateId = update.update_id;
  const msg = update.message || update.edited_message || update.channel_post;
  const from = msg?.from || update.my_chat_member?.from;
  const chatId = msg?.chat?.id || update.my_chat_member?.chat?.id;

  let senderInfo = null;

  if (chatId && from) {
    const idStr = String(chatId);
    const nameParts = [from.first_name, from.last_name].filter(Boolean);
    const fullName = nameParts.join(" ");
    const username = from.username ? `@${from.username}` : "";
    const displayName = fullName || username || `Chat ${idStr}`;

    senderInfo = {
      chat_id: idStr,
      name: displayName,
      username: from.username || null,
    };

    cachedSenders.set(idStr, senderInfo);
  }

  // Handle bot command responses (/start, /help, /stop)
  if (msg?.text && chatId && token && updateId) {
    const text = String(msg.text).trim();
    if (!repliedUpdates.has(updateId)) {
      let replyText = null;

      if (text.startsWith("/start")) {
        replyText = COMMAND_RESPONSES.START;
      } else if (text.startsWith("/help")) {
        replyText = COMMAND_RESPONSES.HELP;
      } else if (text.startsWith("/stop")) {
        replyText = COMMAND_RESPONSES.STOP;
      }

      if (replyText) {
        repliedUpdates.add(updateId);

        // Keep set size bounded to 1000 items
        if (repliedUpdates.size > 1000) {
          const first = repliedUpdates.values().next().value;
          repliedUpdates.delete(first);
        }

        try {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: String(chatId),
              text: replyText,
            }),
          });
        } catch (e) {
          console.error("Failed to send Telegram command response:", e);
        }
      }
    }
  }

  return senderInfo;
}

export function getCachedSenders() {
  return Array.from(cachedSenders.values());
}
