// PayPhantom MCP server (stdio) — minimal, dependency-free.
// Exposes one read-only tool, `receipt_gas_quote`, which reports the
// planning cost of minting one PayPhantom receipt NFT on BNB Chain:
// current gas price + estimated gas units + estimated BNB, and (when
// RECEIPT_MINTER_ADDRESS is set) whether the minter wallet can afford it.
// It reads public BSC RPC only. It never signs, never spends, never needs
// an API key. Wired in .kiro/settings/mcp.json as "payphantom-tools".
//
// Protocol: JSON-RPC 2.0 over stdio (MCP 2025-03-26 surface: initialize,
// notifications/initialized, tools/list, tools/call, ping).
// Test: printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"receipt_gas_quote","arguments":{}}}' | node scripts/mcp-payphantom.mjs

const BSC_RPC = process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org";
const ESTIMATED_GAS_UNITS = 150_000;

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

async function rpc(method, params = []) {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`BSC RPC ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`BSC RPC error: ${data.error.message}`);
  return data.result;
}

async function receiptGasQuote() {
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
    note: "Planning estimate (150k gas). Real cost is set by eth_estimateGas against the deployed contract. Minting is deferred until the operator confirms it.",
  };
}

const TOOLS = [
  {
    name: "receipt_gas_quote",
    description:
      "Read-only planning quote for minting one PayPhantom receipt NFT on BNB Chain: gas units, current gas price, estimated BNB cost, and whether the minter wallet can afford it. Never signs or spends.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.method === "notifications/initialized" || msg.method === "notifications/cancelled") continue;
    const id = msg.id;
    try {
      if (msg.method === "initialize") {
        send({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-03-26",
            capabilities: { tools: {} },
            serverInfo: { name: "payphantom-tools", version: "0.1.0" },
          },
        });
      } else if (msg.method === "ping") {
        send({ jsonrpc: "2.0", id, result: {} });
      } else if (msg.method === "tools/list") {
        send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
      } else if (msg.method === "tools/call") {
        const name = msg.params?.name;
        if (name !== "receipt_gas_quote") throw new Error(`unknown tool: ${name}`);
        const quote = await receiptGasQuote();
        send({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(quote, null, 2) }],
          },
        });
      } else {
        send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${msg.method}` } });
      }
    } catch (err) {
      if (id !== undefined) {
        send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(err.message || err) } });
      }
    }
  }
});
