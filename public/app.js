// PayPhantom frontend — chat + invoice list + receipt list.
// Plain vanilla JS, no framework. Talks to the same-origin API.

const logEl = document.getElementById("log");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const healthEl = document.getElementById("health");
const invoicesEl = document.getElementById("invoices");
const receiptsEl = document.getElementById("receipts");

function addMsg(text, who) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  // Linkify bare URLs.
  div.innerHTML = String(text).replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function money(currency, total) {
  if (currency === "IDR") return `Rp${Number(total).toLocaleString("id-ID")}`;
  return `$${Number(total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function refreshHealth() {
  try {
    const r = await fetch("/api/health");
    const h = await r.json();
    healthEl.textContent = `Mode: ${h.mode} (PayPal ${h.paypal}) · AI: ${h.gemini ? "aktif" : "belum dikonfigurasi"} · Struk NFT: ${h.receipt} (mint on-chain menyusul)`;
  } catch {
    healthEl.textContent = "Server tidak merespons.";
  }
}

async function refreshLists() {
  const invRes = await fetch("/api/invoices");
  const invData = await invRes.json();
  invoicesEl.innerHTML = "";
  if (!invData.invoices.length) {
    invoicesEl.innerHTML = '<p class="empty">Belum ada invoice.</p>';
  }
  for (const inv of invData.invoices) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="row"><strong>${inv.number}</strong><span class="badge ${inv.status}">${inv.status}</span></div>
      <div>${inv.recipientName} (${inv.recipientEmail})</div>
      <div>${money(inv.currency, inv.total)}${inv.dueDate ? ` · jatuh tempo ${inv.dueDate}` : ""}</div>
      <div><a href="${inv.paymentUrl}" target="_blank" rel="noopener">Link pembayaran</a></div>
      ${inv.status === "SENT" ? `<button data-mockpay="${inv.id}">Simulasikan pembayaran (mock)</button>` : ""}
      ${inv.status === "PAID" ? `<button data-quote="${inv.id}">Cek biaya mint struk</button>` : ""}`;
    invoicesEl.appendChild(card);
  }

  const rcRes = await fetch("/api/receipts");
  const rcData = await rcRes.json();
  receiptsEl.innerHTML = "";
  if (!rcData.receipts.length) {
    receiptsEl.innerHTML = '<p class="empty">Belum ada struk. Struk dibuat begitu invoice dibayar.</p>';
  }
  for (const rc of rcData.receipts) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="row"><strong>${rc.id}</strong><span class="badge ${rc.status}">${rc.status}</span></div>
      <div>Invoice: ${rc.invoiceNumber} · ${money(rc.currency, rc.amount)}</div>
      <div>Dibayar: ${new Date(rc.paidAt).toLocaleString("id-ID")}</div>
      <div>${rc.tokenId ? `Token ID: #${rc.tokenId}` : "Token ID: — (menunggu mint on-chain)"}</div>
      ${rc.txHash ? `<div>Tx: ${rc.txHash}</div>` : ""}`;
    receiptsEl.appendChild(card);
  }
}

invoicesEl.addEventListener("click", async (e) => {
  const mockBtn = e.target.closest("[data-mockpay]");
  if (mockBtn) {
    mockBtn.disabled = true;
    const r = await fetch(`/api/invoices/${mockBtn.dataset.mockpay}/mock-pay`, { method: "POST" });
    const data = await r.json();
    if (data.receipt) {
      addMsg(`Pembayaran disimulasikan. Struk ${data.receipt.id} dibuat (status ${data.receipt.status}${data.receipt.tokenId ? `, token #${data.receipt.tokenId}` : ""}).`, "bot");
    }
    await refreshLists();
    return;
  }
  const quoteBtn = e.target.closest("[data-quote]");
  if (quoteBtn) {
    quoteBtn.disabled = true;
    const r = await fetch(`/api/invoices/${quoteBtn.dataset.quote}/receipt/quote`, { method: "POST" });
    const q = await r.json();
    if (q.error) {
      addMsg(`Kutipan biaya gagal: ${q.error}`, "bot");
    } else {
      addMsg(
        `Perkiraan biaya mint struk: ~${q.gasUnits.toLocaleString()} gas × ${q.gasPriceGwei.toFixed(2)} gwei ≈ ${q.estimatedBnb.toFixed(6)} BNB.` +
        (q.walletBnb !== null ? ` Saldo wallet minter: ${q.walletBnb.toFixed(6)} BNB — ${q.affordable ? "cukup" : "BELUM cukup"}.` : " (alamat wallet minter belum diatur)") +
        ` ${q.note}`,
        "bot"
      );
    }
    quoteBtn.disabled = false;
  }
});

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  addMsg(text, "user");
  inputEl.value = "";
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await r.json();
    addMsg(data.reply || "Tidak ada balasan.", "bot");
  } catch {
    addMsg("Server tidak merespons. Coba lagi sebentar lagi.", "bot");
  }
  await refreshLists();
});

addMsg("Halo! Saya PayPhantom 👻 — tulis permintaan invoice seperti biasa, dan begitu dibayar saya buatkan struk NFT-nya di BNB Chain.", "bot");
refreshHealth();
refreshLists();
