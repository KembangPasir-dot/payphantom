// PayPhantom store — in-memory records for invoices and receipts.
// No persistence by design (demo/hackathon scaffold): restarting the server
// clears the records. Nothing here ever holds secrets or keys.

const invoices = new Map(); // id -> invoice object
const receipts = new Map(); // id -> receipt object

function addInvoice(inv) {
  invoices.set(inv.id, inv);
  return inv;
}

function getInvoice(id) {
  return invoices.get(id) || null;
}

function listInvoices() {
  return [...invoices.values()].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
}

function updateInvoice(id, patch) {
  const inv = invoices.get(id);
  if (!inv) return null;
  Object.assign(inv, patch);
  return inv;
}

function addReceipt(rcpt) {
  receipts.set(rcpt.id, rcpt);
  return rcpt;
}

function getReceipt(id) {
  return receipts.get(id) || null;
}

function listReceipts() {
  return [...receipts.values()].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
}

function updateReceipt(id, patch) {
  const r = receipts.get(id);
  if (!r) return null;
  Object.assign(r, patch);
  return r;
}

module.exports = {
  addInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  addReceipt,
  getReceipt,
  listReceipts,
  updateReceipt,
};
