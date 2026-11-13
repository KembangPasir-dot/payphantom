// PayPhantom — lib/gemini.js
// Parses a plain-language invoice request (Indonesian or English) into
// structured JSON via the Gemini REST API (gemini-3.6-flash).
// Uses Node 24 global fetch. No SDK, no extra dependencies.
// NEVER log GEMINI_API_KEY.
//
// Difference vs the earlier PayPilot parser: TODAY is computed from the
// server clock (Asia/Makassar) instead of being hard-coded, so relative
// dates ("besok", "minggu depan") always resolve against the real date.

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

function todayWITA() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return { iso: `${get("year")}-${get("month")}-${get("day")}`, weekday: get("weekday") };
}

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00+08:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildPrompt(message) {
  const { iso: TODAY, weekday } = todayWITA();
  return `Today is ${TODAY} (${weekday}, Asia/Makassar, WITA). You parse a plain-language invoice request (Indonesian or English) into JSON.

User message:
"""${message}"""

Output ONLY a JSON object (no markdown, no explanation) with exactly these fields:
{
  "isInvoiceRequest": true | false,
  "recipientName": string | null,
  "recipientEmail": string | null,
  "items": [ { "name": string, "quantity": number, "unitPrice": number } ],
  "currency": "IDR" | "USD",
  "dueDate": "YYYY-MM-DD" | null,
  "note": string | null
}

Rules:
- isInvoiceRequest: true only if the user asks to bill/charge/invoice someone ("tagih", "invoice", "bill", "charge", "minta bayar"). Greetings, questions, or anything else => false (other fields null / empty).
- recipientName: the person/company being billed. recipientEmail: their email address, or null if not given in the message. Do NOT invent an email.
- Amounts: "Rp500.000" = 500000 IDR; "500 ribu" = 500000; "1,5 juta" = 1500000; "2 juta" = 2000000; "$120" = 120 USD; "US$50" = 50 USD. Strip thousand separators (dots/commas as used in Indonesian formatting). unitPrice is a plain number (no decimals needed for whole amounts).
- Default currency: IDR when the amount is in Rp/rupiah/ribu/juta; USD when the amount is in $/dollar. If no amount at all, default "IDR".
- Single service/product = one item. If the user lists several services, one item per service with its own price.
- Relative dates (today is ${TODAY}, a ${weekday}): "besok" / "tomorrow" = ${addDays(TODAY, 1)}; "minggu depan" / "next week" = ${addDays(TODAY, 7)}; "Jumat" / "Friday" = the next Friday on or after ${TODAY}; "akhir bulan" / "end of month" = the last day of this month; "2 minggu lagi" / "in 2 weeks" = ${addDays(TODAY, 14)}. Resolve any other relative date the same way. If no due date is given, dueDate is null.
- note: any extra instruction from the user (e.g. "terima kasih", payment note), otherwise null.`;
}

function stripFences(text) {
  let t = (text || "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  return t;
}

/**
 * Parse a user message with Gemini.
 * @returns {Promise<object|null>} parsed JSON, or null when the API key is
 *   unset (caller treats that as "AI not configured") — never throws for a
 *   missing key. Throws on API/HTTP failures so the caller can reply
 *   gracefully instead of crashing.
 */
async function parseInvoiceRequest(message) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null; // AI not configured

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(message) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text content");

  return JSON.parse(stripFences(text));
}

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

module.exports = { parseInvoiceRequest, isGeminiConfigured };
