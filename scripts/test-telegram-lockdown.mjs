// E2E-style verification of the Telegram route lockdown, run against the
// production Next server with the Telegram API stubbed via a local mock.
// Exercises BOTH: (A) legitimate pairing + alert flow, (B) attack paths.
import http from "http";

const BASE = process.env.TEST_BASE || "http://127.0.0.1:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";

// Read the server-side Telegram send log (written by the stub in the server
// process) to prove which chat actually received each message.
function readSentLog() {
  try {
    const raw = execSync("cat /tmp/tg-sent.log 2>/dev/null", { encoding: "utf8" });
    return raw.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch { return []; }
}
let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}

async function api(path, opts) {
  const res = await fetch(`${BASE}${path}`, opts);
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

async function main() {
  // ------------------------------------------------------------------
  // (B1) Attack: unauthenticated GET to get-chat-id with NO token
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] get-chat-id with no token");
  const noTok = await api("/api/telegram/get-chat-id");
  check("rejected with 401", noTok.status === 401, `got ${noTok.status}`);
  check("no sender data leaked", !(noTok.body?.senders?.length > 0), JSON.stringify(noTok.body));

  // ------------------------------------------------------------------
  // (B2) Attack: get-chat-id with a guessed/fake token
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] get-chat-id with guessed token");
  const fakeTok = await api("/api/telegram/get-chat-id?token=AAAAAAAA");
  check("rejected with 401 or empty list", fakeTok.status === 401 || (fakeTok.body?.ok === true && fakeTok.body?.senders?.length === 0), JSON.stringify(fakeTok.body));

  // ------------------------------------------------------------------
  // (B3) Attack: getUpdates-poll route must not return the full sender list
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] full sender-list enumeration is gone");
  // Drive a webhook update for an *unpaired* sender through the ingestion
  // path (webhook itself is 2.4's scope, but we only use it here to seed
  // state — we are not testing it). Then verify get-chat-id for a DIFFERENT
  // token does not return that sender.
  const seed = { update_id: Date.now(), message: { message_id: 1, from: { id: 999, first_name: "Stranger", username: "stranger" }, chat: { id: 999 }, text: "hello bot" } };
  await api("/api/telegram/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(seed) });
  const afterSeed = await api("/api/telegram/get-chat-id?token=BBBBBBBB");
  check("unpaired sender NOT returned to another token", afterSeed.status === 401 || afterSeed.body?.senders?.length === 0, JSON.stringify(afterSeed.body));

  // ------------------------------------------------------------------
  // (A) Legitimate flow: caregiver pairs with the patient's token
  // ------------------------------------------------------------------
  console.log("\n[LEGIT] caregiver pairing flow");
  const PATIENT_TOKEN = "PAIRTEST";
  const caregiverUpdate = { update_id: Date.now() + 1, message: { message_id: 2, from: { id: 4242, first_name: "Care", last_name: "Giver", username: "caregiver" }, chat: { id: 4242 }, text: `/start ${PATIENT_TOKEN}` } };
  await api("/api/telegram/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(caregiverUpdate) });

  const paired = await api(`/api/telegram/get-chat-id?token=${PATIENT_TOKEN}`);
  check("paired lookup succeeds", paired.status === 200 && paired.body?.ok === true, JSON.stringify(paired.body));
  check("returns exactly ONE sender (scoped, not global)", paired.body?.senders?.length === 1, JSON.stringify(paired.body));
  check("returns the RIGHT sender", paired.body?.senders?.[0]?.chat_id === "4242" && paired.body?.senders?.[0]?.name === "Care Giver", JSON.stringify(paired.body?.senders));
  check("the stranger from B3 is NOT in the response", !paired.body?.senders?.some((s) => s.chat_id === "999"), JSON.stringify(paired.body?.senders));

  // ------------------------------------------------------------------
  // (B4) Attack: send-alert with arbitrary chat_id (old API shape)
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] send-alert with client-supplied chat_id");
  const chatIdAttack = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: "999", message: "phishing alert" }),
  });
  check("chat_id-only request rejected (401)", chatIdAttack.status === 401, `got ${chatIdAttack.status}`);
  check("no message_id returned", !chatIdAttack.body?.message_id, JSON.stringify(chatIdAttack.body));

  // ------------------------------------------------------------------
  // (B5) Attack: send-alert with a token that has no pairing
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] send-alert with unpaired token");
  const unpaired = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "ZZZZZZZZ", message: "hello?" }),
  });
  check("unpaired token rejected (401/404)", unpaired.status === 401 || unpaired.status === 404, `got ${unpaired.status}`);

  // ------------------------------------------------------------------
  // (B6) Attack: send-alert with attacker's own token + forged chat_id field
  // (token valid but chat_id must be ignored — server resolves destination)
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] send-alert ignores client chat_id even with valid token");
  const forged = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: PATIENT_TOKEN, chat_id: "999", message: "should go to 4242 only" }),
  });
  check("request accepted (valid token)", forged.status === 200, `got ${forged.status} ${JSON.stringify(forged.body)}`);

  // Prove the forged chat_id was IGNORED: the stub log shows which chat the
  // server actually sent to. The attacker-supplied 999 must never appear.
  const sentAfterForged = readSentLog();
  const lastSent = sentAfterForged[sentAfterForged.length - 1];
  check("server sent to PAIRED chat 4242, not attacker's 999", lastSent?.chat_id === "4242", JSON.stringify(lastSent));
  check("attacker chat 999 NEVER appears in any outbound send", !sentAfterForged.some((s) => String(s.chat_id) === "999"), JSON.stringify(sentAfterForged));

  // ------------------------------------------------------------------
  // (A) Legitimate flow: alert send with valid token
  // ------------------------------------------------------------------
  console.log("\n[LEGIT] alert send flow");
  await sleep(3100); // respect the 3s per-token min interval from the forged send
  const legit = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: PATIENT_TOKEN, message: "🚨 ALERT from Aloud: test" }),
  });
  check("legitimate alert sends OK", legit.status === 200 && legit.body?.ok === true, JSON.stringify(legit.body));

  // Rate limit: alerts are min-3s apart per token. The forged request above
  // and this one count against the same token's window.
  console.log("\n[LEGIT] per-token rate limiting");
  let got429 = false;
  for (let i = 0; i < 12; i++) {
    const r = await api("/api/telegram/send-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: PATIENT_TOKEN, message: `burst ${i}` }),
    });
    if (r.status === 429) { got429 = true; break; }
  }
  check("burst alerts get 429 (per-token, not global)", got429, "no 429 after 12 rapid sends");

  // A DIFFERENT valid token must NOT be blocked by patient's rate limit
  // (proves it's per-token, not a shared global timer).
  const otherUpdate = { update_id: Date.now() + 2, message: { message_id: 3, from: { id: 777, first_name: "Other", username: "other" }, chat: { id: 777 }, text: `/start OTHERTOK` } };
  await api("/api/telegram/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(otherUpdate) });
  const other = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "OTHERTOK", message: "independent token works" }),
  });
  check("second patient token unaffected by first's rate limit", other.status === 200, `got ${other.status} ${JSON.stringify(other.body)}`);

  // ------------------------------------------------------------------
  // (B7) Message validation
  // ------------------------------------------------------------------
  console.log("\n[ATTACK] message validation");
  const empty = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "OTHERTOK", message: "   " }),
  });
  check("empty message rejected", empty.status === 400, `got ${empty.status}`);
  const oversized = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "OTHERTOK", message: "x".repeat(600) }),
  });
  check("oversized message rejected", oversized.status === 400, `got ${oversized.status}`);
  const badType = await api("/api/telegram/send-alert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "OTHERTOK", message: { evil: true } }),
  });
  check("non-string message rejected", badType.status === 400, `got ${badType.status}`);

  console.log(`\n========== RESULT: ${pass} passed, ${fail} failed ==========`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
