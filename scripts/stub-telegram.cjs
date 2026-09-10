// Test-only stub: intercepts outbound fetch() to api.telegram.org in the Next
// server process so e2e tests can run without a real bot token. Loaded via
// NODE_OPTIONS="--require ./scripts/stub-telegram.cjs".
const realFetch = global.fetch;

global.fetch = async function stubbedFetch(url, opts) {
  if (typeof url === "string" && url.includes("api.telegram.org")) {
    if (url.includes("/getUpdates")) {
      return new Response(JSON.stringify({ ok: true, result: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.includes("/sendMessage")) {
      // Echo the request payload back and append it to a log the test can
      // inspect to prove which chat actually received the message.
      let sent = {};
      try { sent = JSON.parse(opts?.body || "{}"); } catch {}
      try {
        const fs = require("fs");
        fs.appendFileSync(process.env.TG_SENT_LOG || "/tmp/tg-sent.log", JSON.stringify(sent) + "\n");
      } catch {}
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1, sent } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true, result: [] }), { status: 200 });
  }
  return realFetch(url, opts);
};

console.log("[stub-telegram] api.telegram.org fetch stub installed");
