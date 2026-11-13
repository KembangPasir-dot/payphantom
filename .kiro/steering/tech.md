---
inclusion: always
---

# Tech — PayPhantom

## Stack

- **Runtime:** Node.js >= 24 (global `fetch`, CommonJS modules).
- **Backend:** Express 5, no build step, no framework on the frontend.
- **Frontend:** vanilla HTML/CSS/JS in `public/` (no bundler).
- **AI parsing:** Gemini REST API (`gemini-3.6-flash`, JSON mode, temperature 0.2). No SDK.
- **Payments:** PayPal Invoicing API v2, sandbox only (`api-m.sandbox.paypal.com`). OAuth client-credentials token, cached in memory.
- **Chain reads:** public BSC JSON-RPC (no key) for gas price + wallet balance. `ethers` is NOT a dependency of the app yet; receipt quotes use raw `fetch` JSON-RPC.
- **Contract:** Solidity 0.8.28, OpenZeppelin ERC-721 (sketch in `contracts/`, Foundry for compile/test at deploy time).
- **Tests:** `node --test` (built-in runner), offline-safe by default.

## Conventions

- Prefer small modules in `lib/` with one responsibility each; `server.js`
  only wires routes.
- All credentials come from environment variables (`.env`, never committed).
  Missing credentials => mock mode, never a crash.
- Money: plain numbers in code, strings with exactly 2 decimals at the
  PayPal boundary (`Number(n).toFixed(2)`). No float arithmetic on money.
- Dates: ISO `YYYY-MM-DD`; "today" is computed from the server clock in
  Asia/Makassar, never hard-coded.
- HTTP: user-facing errors are JSON with a clear message and the right
  status (404 unknown id, 409 receipt before payment, 502 BSC unreachable).
  The chat endpoint always answers HTTP 200 with a graceful reply.

## Key facts the agent must not forget

- PayPal create-invoice answers 201 with ONLY a self link: the invoice id
  is parsed from the `href`, NOT from `data.id`.
- PayPal Invoicing rejects IDR in this sandbox flow; USD works. (Currency
  handling follows the parsed request; sandbox quirks are surfaced, not hidden.)
- The receipt mint is deferred by design: the server never signs. See
  `design.md` "Receipt minting" and `lib/receipt.js`.
- Kiro CLI on this VM: `~/.local/bin/kiro-cli` (3.3.0), not signed in.
  Sign-in is the user's step (`kiro-cli login --social github`).
