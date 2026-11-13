---
inclusion: always
---

# Structure — PayPhantom

## Layout

```
payphantom/
├── server.js                 # Express app: routes only
├── lib/
│   ├── gemini.js             # chat -> invoice JSON (Gemini REST)
│   ├── paypal.js             # PayPal sandbox invoicing + mock
│   ├── receipt.js            # receipt records + read-only gas quotes
│   └── store.js              # in-memory invoice + receipt Maps
├── public/                   # vanilla chat UI (index.html, app.js, styles.css)
├── contracts/
│   └── PayPhantomReceipt.sol # ERC-721 receipt sketch (not deployed)
├── scripts/
│   ├── hook-check-js.sh      # PostFileSave helper: node --check on saved .js
│   └── mcp-payphantom.mjs    # stdio MCP server: receipt_gas_quote
├── tests/
│   └── smoke.test.js         # node:test, offline-safe
├── .kiro/
│   ├── specs/payphantom/     # requirements.md, design.md, tasks.md
│   ├── steering/             # product.md, tech.md, structure.md, security-policies.md
│   ├── hooks/                # quality-gates.json
│   └── settings/mcp.json     # workspace MCP config
├── .env.example              # placeholders only, no real values
├── .gitignore                # node_modules, .env — NEVER .kiro
├── package.json  README.md  LICENSE  SUBMISSION-DRAFT.md  HANDOFF.md
```

## Naming

- Files: kebab-case for scripts (`hook-check-js.sh`), camelCase JS modules
  in `lib/` (`gemini.js`, `paypal.js`, `receipt.js`, `store.js`).
- IDs: invoices `PP-<base36>` numbers, PayPal ids `INV2-…`; receipts
  `RCPT-<base36>`.
- Kiro spec name: `payphantom` (one spec for the whole entry).

## Import patterns

- `server.js` requires `./lib/*` by relative path; libs require nothing
  from each other except `receipt.js` (no requires) and `server.js`
  (requires all four libs). Keep it that way: no circular imports.
- Frontend talks to same-origin `/api/*` only; no third-party CDNs.

## What goes where

- New API behavior: route in `server.js`, logic in the matching `lib/`
  module, test in `tests/smoke.test.js`.
- New Kiro knowledge: steering file in `.kiro/steering/` (one domain per
  file); new automation: hook JSON in `.kiro/hooks/`; new MCP tool:
  extend `scripts/mcp-payphantom.mjs` and declare it in
  `.kiro/settings/mcp.json`.
- Spec changes: update `requirements.md` first, then `design.md`, then
  `tasks.md` — in that order.
