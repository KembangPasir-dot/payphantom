# 👻 PayPhantom

**Kiroween 2026 — Frankenstein category.** An AI chat agent that turns
plain-language billing requests into PayPal invoices — and mints an on-chain
NFT receipt on BNB Chain for every paid invoice.

Three systems that never meet in one product: **Gemini** (chat parsing),
**PayPal** (Web2 money), **BNB Chain** (Web3 proof). A freelancer types
"Tagih Budi Rp500.000 untuk desain logo" and gets a sent invoice; when Budi
pays, a receipt NFT proves it happened — verifiable on-chain, forever.

## How it works

```
chat ("Tagih Budi…") → Gemini parses → PayPal invoice sent
     → client pays → receipt record (PENDING) → operator confirms mint
     → PayPhantomReceipt NFT on BNB Chain (BscScan-verifiable)
```

- **Mock mode (no credentials):** the whole story runs end to end —
  chat → invoice → mock-pay → MOCK receipt — with zero keys and zero BNB.
- **Live mode (PayPal sandbox):** set the sandbox credentials and
  `PAYPAL_MOCK=false`; invoices become real sandbox invoices.
- **Receipt minting is deferred by design.** The server never signs or
  broadcasts a mint. A paid invoice first gets a receipt *record*
  (PENDING); the on-chain mint happens later, only when the operator
  confirms it and the wallet holds enough BNB. See
  `.kiro/specs/payphantom/design.md` for the decision record.

## Run

```bash
npm install
cp .env.example .env   # fill in GEMINI_API_KEY + PayPal sandbox creds (optional in mock mode)
npm start              # → http://localhost:3000
npm test               # offline-safe smoke tests
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | ok, mode, gemini, paypal, receipt=deferred |
| POST | `/api/chat` | parse + create + send invoice |
| GET | `/api/invoices` | list invoices |
| GET | `/api/invoices/:id` | one invoice (live mode refreshes from PayPal) |
| POST | `/api/invoices/:id/mock-pay` | mock only: mark PAID + MOCK receipt |
| POST | `/api/invoices/:id/receipt/quote` | read-only gas quote for one mint |
| POST | `/api/invoices/:id/receipt/request` | record a receipt (409 unless PAID) |
| GET | `/api/receipts` | list receipts |

## Project layout

See `.kiro/steering/structure.md`. The Kiro configuration lives in
`.kiro/` and ships in this repo (required by the hackathon rules):
specs in `.kiro/specs/payphantom/`, steering in `.kiro/steering/`,
hooks in `.kiro/hooks/`, MCP config in `.kiro/settings/mcp.json`.

## How Kiro was used

- **Specs:** requirements → design → tasks, written before the code.
- **Steering:** product / tech / structure / security docs, always on.
- **Hooks:** `node --check` on every saved `.js` file; a pre-finish
  reminder to run tests and check for staged secrets.
- **MCP:** a local stdio server (`scripts/mcp-payphantom.mjs`) exposing
  `receipt_gas_quote`, so the agent can price a mint without keys.
- **CLI:** Kiro CLI 3.3.0 (`kiro-cli`), installed from
  `https://cli.kiro.dev/install`.

## Status

Live, 2026-11-13. Kiro CLI signed in (Builder ID), 4,000 Kiroween bonus credits confirmed in the account, and two real sandbox invoices created end to end (Sarah $120, SENT). Next: demo video, receipt contract deploy + first confirmed mint, Devpost submit by 5 Dec 2026 06:00 WITA. See `HANDOFF.md` and `.kiro/specs/payphantom/tasks.md`.

## License

MIT.
