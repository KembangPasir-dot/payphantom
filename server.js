// PayPhantom backend — server.js
// AI chat agent: plain-language request -> PayPal invoice (sandbox) ->
// on payment, an NFT receipt record on BNB Chain (deferred/optional mint).
// ============================ RUN ============================
//   npm install
//   cp .env.example .env        # fill in GEMINI_API_KEY + PayPal creds
//   npm start                   # -> http://localhost:3000
// Mock mode (no credentials): full chat -> invoice -> mock-pay -> MOCK
// receipt flow works end-to-end with zero credentials and zero BNB.
// Live PayPal sandbox: set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and
// PAYPAL_MOCK=false (or unset PAYPAL_MOCK).
// Receipt minting is DEFERRED by design (see lib/receipt.js): this server
// never signs or broadcasts a mint. It only records receipts and quotes
// the gas cost read-only.
// ===============================================================

require("dotenv").config();
const path = require("path");
const express = require("express");
const { parseInvoiceRequest, isGeminiConfigured } = require("./lib/gemini");
const paypal = require("./lib/paypal");
const store = require("./lib/store");
const receipt = require("./lib/receipt");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serves public/ at /

const paypalMode = () => (paypal.isLiveMode() ? "live" : "mock");

// ---------- helpers ----------

function formatMoney(currency, total) {
  if (currency === "IDR") return `Rp${Number(total).toLocaleString("id-ID")}`;
  return `$${Number(total).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function totalOf(parsed) {
  return (parsed.items || []).reduce(
    (s, i) => s + (i.quantity || 1) * i.unitPrice,
    0
  );
}

// ---------- API ----------

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    name: "PayPhantom",
    mode: paypalMode(),
    gemini: isGeminiConfigured(),
    paypal: paypalMode(),
    receipt: "deferred", // PENDING records; on-chain mint is operator-confirmed
  });
});

app.post("/api/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) {
    return res.json({
      reply: "Tulis permintaan invoice-nya, contoh: Tagih Budi budi@example.com Rp500.000 untuk desain logo, jatuh tempo minggu depan.",
      invoice: null,
      parsed: null,
      paypalMode: paypalMode(),
    });
  }

  // 1) AI not configured -> graceful reply, HTTP 200, no crash.
  if (!isGeminiConfigured()) {
    return res.json({
      reply: "AI belum dikonfigurasi. Minta admin mengatur GEMINI_API_KEY di server, lalu coba lagi.",
      invoice: null,
      parsed: null,
      paypalMode: paypalMode(),
    });
  }

  // 2) Parse with Gemini.
  let parsed;
  try {
    parsed = await parseInvoiceRequest(message);
  } catch (err) {
    console.error("[gemini] parse failed:", err.message);
    return res.json({
      reply:
        "Maaf, AI gagal memahami permintaan itu (layanan AI sedang bermasalah). Coba lagi sebentar lagi, atau tulis dengan format: Tagih [nama] [email] Rp[jumlah] untuk [layanan], jatuh tempo [tanggal].",
      invoice: null,
      parsed: null,
      paypalMode: paypalMode(),
    });
  }
  if (!parsed) {
    return res.json({
      reply: "AI belum dikonfigurasi. Minta admin mengatur GEMINI_API_KEY di server, lalu coba lagi.",
      invoice: null,
      parsed: null,
      paypalMode: paypalMode(),
    });
  }

  // 3) Not an invoice request -> clarifying question, no invoice.
  if (!parsed.isInvoiceRequest) {
    return res.json({
      reply:
        "Halo! Saya PayPhantom — saya bisa membuat dan mengirim invoice PayPal dari pesan biasa, dan setiap invoice yang dibayar mendapat struk NFT di BNB Chain. Coba tulis misalnya: Tagih Budi budi@example.com Rp500.000 untuk desain logo, jatuh tempo minggu depan.",
      invoice: null,
      parsed: null,
      paypalMode: paypalMode(),
    });
  }

  // 4) Missing recipient email -> ask for it, do NOT create an invoice.
  if (!parsed.recipientEmail) {
    const name = parsed.recipientName || "penerima";
    return res.json({
      reply: `Saya sudah paham: tagih ${name} untuk ${parsed.items?.[0]?.name || "layanan"} sebesar ${formatMoney(parsed.currency, totalOf(parsed))}${parsed.dueDate ? `, jatuh tempo ${parsed.dueDate}` : ""}. Boleh minta alamat email ${name} supaya invoice bisa dikirim?`,
      invoice: null,
      parsed,
      paypalMode: paypalMode(),
    });
  }

  // Missing items/amount -> ask for the amount.
  if (!parsed.items || parsed.items.length === 0 || !parsed.items[0].unitPrice) {
    return res.json({
      reply: `Tagih ${parsed.recipientName} (${parsed.recipientEmail}) untuk apa dan berapa jumlahnya? Contoh: Rp500.000 untuk desain logo.`,
      invoice: null,
      parsed,
      paypalMode: paypalMode(),
    });
  }

  // 5) Create + send the invoice.
  try {
    let invoice;
    if (paypal.isLiveMode()) {
      const { id, number } = await paypal.createInvoiceLive(parsed);
      await paypal.sendInvoiceLive(id);
      const live = await paypal.getInvoiceLive(id);
      invoice = {
        id,
        number,
        recipientName: parsed.recipientName,
        recipientEmail: parsed.recipientEmail,
        currency: parsed.currency || "IDR",
        total: totalOf(parsed),
        dueDate: parsed.dueDate || null,
        status: live.status || "SENT",
        paymentUrl: live.paymentUrl,
        createdAt: new Date().toISOString(),
      };
    } else {
      // MOCK: simulated create + send, status SENT.
      invoice = paypal.mockCreateInvoice(parsed);
    }
    store.addInvoice(invoice);

    const reply = `Invoice ${invoice.number} berhasil dibuat dan dikirim ke ${invoice.recipientName} (${invoice.recipientEmail}).\nTotal: ${formatMoney(invoice.currency, invoice.total)}${invoice.dueDate ? `\nJatuh tempo: ${invoice.dueDate}` : ""}\nStatus: ${invoice.status}\nLink pembayaran: ${invoice.paymentUrl}\n\nBegitu invoice ini dibayar, saya buatkan struk NFT-nya di BNB Chain (saat ini: tercatat dulu, mint on-chain menyusul — lihat /api/receipts).`;
    return res.json({ reply, invoice, parsed, paypalMode: paypalMode() });
  } catch (err) {
    console.error("[paypal] create/send failed:", err.message);
    const detail = String(err.message || "unknown error").slice(0, 300);
    return res.json({
      reply:
        `Maaf, invoice gagal dibuat di PayPal. PayPal menolak permintaan ini: ${detail}\n` +
        "Coba lagi sebentar lagi, atau periksa izin Invoicing pada aplikasi PayPal (Developer Dashboard).",
      invoice: null,
      parsed,
      paypalMode: paypalMode(),
    });
  }
});

app.get("/api/invoices", (req, res) => {
  res.json({ invoices: store.listInvoices() });
});

app.get("/api/invoices/:id", async (req, res) => {
  const inv = store.getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found" });

  // Live mode: refresh status from PayPal first.
  if (paypal.isLiveMode()) {
    try {
      const live = await paypal.getInvoiceLive(inv.id);
      store.updateInvoice(inv.id, { status: live.status, paymentUrl: live.paymentUrl });
      // Newly PAID in live mode -> create a PENDING receipt record.
      if (live.status === "PAID" && inv.status !== "PAID") {
        const rcpt = receipt.createReceiptRecord(store.getInvoice(inv.id), "live");
        store.addReceipt(rcpt);
      }
    } catch (err) {
      console.error("[paypal] status refresh failed:", err.message);
      // Fall through with the stored copy.
    }
  }
  res.json(store.getInvoice(req.params.id));
});

app.post("/api/invoices/:id/mock-pay", (req, res) => {
  // MOCK MODE ONLY: simulate the payer paying, then issue the (mock) receipt.
  if (paypal.isLiveMode()) {
    return res.status(404).json({ error: "mock-pay is only available in mock mode" });
  }
  const inv = store.getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found" });
  store.updateInvoice(inv.id, { status: "PAID" });
  const rcpt = receipt.createReceiptRecord(store.getInvoice(inv.id), "mock");
  store.addReceipt(rcpt);
  res.json({ invoice: store.getInvoice(inv.id), receipt: rcpt });
});

// ---------- receipts (read-only quote + deferred records) ----------

app.post("/api/invoices/:id/receipt/quote", async (req, res) => {
  const inv = store.getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found" });
  try {
    const quote = await receipt.quoteReceiptMint();
    res.json({ invoiceId: inv.id, ...quote });
  } catch (err) {
    console.error("[receipt] quote failed:", err.message);
    res.status(502).json({ error: `BSC RPC unreachable: ${err.message}` });
  }
});

app.post("/api/invoices/:id/receipt/request", (req, res) => {
  // Record a receipt request for a PAID invoice. No chain interaction:
  // live mode -> PENDING (operator mints later after confirmation);
  // mock mode -> MOCK (simulated tokenId, demo only).
  const inv = store.getInvoice(req.params.id);
  if (!inv) return res.status(404).json({ error: "Invoice not found" });
  if (inv.status !== "PAID") {
    return res.status(409).json({ error: `Invoice is ${inv.status}, not PAID — receipt requires payment first` });
  }
  const rcpt = receipt.createReceiptRecord(inv, paypalMode());
  store.addReceipt(rcpt);
  res.json(rcpt);
});

app.get("/api/receipts", (req, res) => {
  res.json({ receipts: store.listReceipts() });
});

app.get("/api/receipts/:id", (req, res) => {
  const rcpt = store.getReceipt(req.params.id);
  if (!rcpt) return res.status(404).json({ error: "Receipt not found" });
  res.json(rcpt);
});

// ---------- root ----------

app.get("/", (req, res) => {
  // express.static already serves public/index.html when present;
  // this fallback covers the case where public/ is empty/missing.
  res.json({
    ok: true,
    name: "PayPhantom",
    message: "PayPhantom backend is running. Use POST /api/chat to create invoices.",
    mode: paypalMode(),
    receipt: "deferred",
  });
});

app.listen(PORT, () => {
  console.log(`PayPhantom backend listening on http://localhost:${PORT} (mode: ${paypalMode()}, gemini: ${isGeminiConfigured() ? "configured" : "not configured"}, receipt: deferred)`);
});
