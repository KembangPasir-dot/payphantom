// PayPhantom — lib/receipt.js
// The Frankenstein half: an on-chain NFT receipt on BNB Chain for each PAID
// invoice. The receipt is an ERC-721 token (see contracts/) whose on-chain
// metadata records the PayPal invoice id, payer, amount, currency and the
// time it was paid — a tamper-proof payment receipt.
//
// DESIGN DECISION — deferred / optional minting (recorded 2026-11-13):
// The operator wallet holds very little BNB (0.000351 BNB on 2026-11-13).
// A receipt mint costs ~100-150k gas, roughly 0.0001-0.00015 BNB at 1 gwei.
// So minting is NEVER automatic and NEVER signed by this server:
//   - Every paid invoice gets a receipt RECORD (status PENDING or MOCK).
//   - In MOCK mode the receipt is simulated end-to-end (status MOCK,
//     fake tokenId) so the full story is demonstrable with zero BNB.
//   - In LIVE mode the record stays PENDING until the operator explicitly
//     mints it later (batch, or after topping up BNB), or the payer opts
//     to fund the gas (future feature, not built yet).
//   - quoteReceiptMint() is READ-ONLY: it reads the minter wallet balance
//     and the current gas price from a public BSC RPC and reports whether
//     a mint is affordable right now. It signs nothing and spends nothing.
//
// The actual broadcast step (mintReceipt on the deployed contract) is
// intentionally NOT implemented here yet: it needs the deployed contract
// address plus the operator's explicit per-mint preview and confirmation.
// That is a build-phase task (see .kiro/specs/payphantom/tasks.md).

const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";

// Planning estimate for a receipt mint (ERC-721 mint with on-chain JSON
// metadata). Refined once the contract is deployed and eth_estimateGas can
// run against it. Deliberately conservative.
const ESTIMATED_GAS_UNITS = 150_000;

function rpcUrl() {
  return process.env.BSC_RPC_URL || BSC_RPC;
}

async function rpc(method, params = []) {
  const res = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`BSC RPC ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`BSC RPC error: ${data.error.message}`);
  return data.result;
}

/**
 * Read-only affordability quote for one receipt mint.
 * Returns gas units, current gas price, estimated BNB cost, the minter
 * wallet balance (if RECEIPT_MINTER_ADDRESS is set), and whether a mint
 * is affordable right now. Never signs, never spends.
 */
async function quoteReceiptMint() {
  const gasPriceHex = await rpc("eth_gasPrice");
  const gasPriceWei = BigInt(gasPriceHex);
  const estimatedWei = gasPriceWei * BigInt(ESTIMATED_GAS_UNITS);
  const minter = process.env.RECEIPT_MINTER_ADDRESS || null;
  let walletBnb = null;
  if (minter) {
    const balHex = await rpc("eth_getBalance", [minter, "latest"]);
    walletBnb = Number(BigInt(balHex)) / 1e18;
  }
  const estimatedBnb = Number(estimatedWei) / 1e18;
  return {
    gasUnits: ESTIMATED_GAS_UNITS,
    gasPriceGwei: Number(gasPriceWei) / 1e9,
    estimatedBnb,
    minterAddress: minter,
    walletBnb,
    affordable: walletBnb === null ? null : walletBnb >= estimatedBnb,
    note:
      "Planning estimate (150k gas). Real cost is set by eth_estimateGas " +
      "against the deployed contract. Minting is deferred until the " +
      "operator confirms it.",
  };
}

function newReceiptId() {
  return `RCPT-${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

/**
 * Create a receipt record for a paid invoice. No chain interaction.
 * mode "mock"  -> status MOCK, fake tokenId (demo only).
 * mode "live"  -> status PENDING (deferred on-chain mint).
 */
function createReceiptRecord(invoice, mode) {
  const isMock = mode === "mock";
  return {
    id: newReceiptId(),
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    payerName: invoice.recipientName,
    payerEmail: invoice.recipientEmail,
    amount: invoice.total,
    currency: invoice.currency,
    paidAt: new Date().toISOString(),
    status: isMock ? "MOCK" : "PENDING",
    tokenId: isMock ? Math.floor(Math.random() * 9000) + 1000 : null,
    txHash: null,
    contractAddress: null, // set once PayPhantomReceipt is deployed
    createdAt: new Date().toISOString(),
  };
}

module.exports = { quoteReceiptMint, createReceiptRecord, ESTIMATED_GAS_UNITS };
