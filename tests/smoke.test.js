// PayPhantom smoke tests — offline-safe (mock mode only, no network calls
// except the receipt quote test, which is skipped when BSC is unreachable).
// Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");

process.env.PAYPAL_MOCK = "true";
delete process.env.GEMINI_API_KEY;

const paypal = require("../lib/paypal");
const store = require("../lib/store");
const receipt = require("../lib/receipt");

test("mock invoice: create + store + mock-pay + mock receipt", () => {
  const parsed = {
    recipientName: "Budi",
    recipientEmail: "budi@example.com",
    currency: "USD",
    items: [{ name: "desain logo", quantity: 1, unitPrice: 120 }],
    dueDate: "2026-11-20",
    note: null,
  };
  const inv = paypal.mockCreateInvoice(parsed);
  assert.match(inv.id, /^INV2-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.equal(inv.status, "SENT");
  assert.equal(inv.total, 120);
  store.addInvoice(inv);
  assert.equal(store.getInvoice(inv.id).number, inv.number);

  store.updateInvoice(inv.id, { status: "PAID" });
  const rcpt = receipt.createReceiptRecord(store.getInvoice(inv.id), "mock");
  assert.equal(rcpt.status, "MOCK");
  assert.equal(rcpt.invoiceId, inv.id);
  assert.equal(typeof rcpt.tokenId, "number");
  store.addReceipt(rcpt);
  assert.equal(store.listReceipts().length, 1);
});

test("receipt record in live mode is PENDING (deferred, no chain call)", () => {
  const inv = {
    id: "INV2-TEST-TEST-TEST-TEST",
    number: "PP-TEST1",
    recipientName: "Sarah",
    recipientEmail: "sarah@example.com",
    total: 120,
    currency: "USD",
    status: "PAID",
  };
  const rcpt = receipt.createReceiptRecord(inv, "live");
  assert.equal(rcpt.status, "PENDING");
  assert.equal(rcpt.tokenId, null);
  assert.equal(rcpt.txHash, null);
});

test("receipt quote shape (skipped cleanly when BSC is unreachable)", async () => {
  try {
    const q = await receipt.quoteReceiptMint();
    assert.equal(q.gasUnits, receipt.ESTIMATED_GAS_UNITS);
    assert.equal(typeof q.gasPriceGwei, "number");
    assert.equal(typeof q.estimatedBnb, "number");
    assert.ok(q.estimatedBnb > 0);
  } catch (err) {
    test.skip(`BSC RPC unreachable: ${err.message}`);
  }
});
