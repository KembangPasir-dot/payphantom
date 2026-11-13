# PayPhantom — Kiroween 2026 handoff

**Project:** PayPhantom — AI chat agent that creates PayPal invoices (sandbox) and mints an
on-chain NFT receipt on BNB Chain for each paid invoice.
**Category:** Frankenstein. **Goal:** `goal_82dfb086a8b2` (slug `kiroween-2026-payphantom-frankenstein`).
**Deadline:** submit on Devpost **Sat 5 Dec 2026 06:00 WITA** (Fri 4 Dec 14:00 PT).
**Repo scaffold:** `~/workspace/kiroween/payphantom/` — **NOT pushed to GitHub yet.**
**Status as of Fri 2026-11-13 ~10:10 WITA:** scaffold complete and verified (see §7).
Kiro CLI installed, **not signed in** (sign-in is the user's step). Contract compiles.

---

## 1. Kiro install / auth status

| Item | Status |
|---|---|
| Kiro CLI | **Installed: kiro-cli 3.3.0** at `~/.local/bin/kiro-cli` (official installer `curl -fsSL https://cli.kiro.dev/install \| bash`, inspected before running; `--no-modify-path`, no sudo, no account, no payment). VM glibc 2.39 (≥2.34 required), Node v24.22.1. |
| Sign-in | **NOT signed in.** `kiro-cli whoami` → "Not logged in" (exit 1). No account created, no credentials stored. |
| How the user signs in (his step) | `kiro-cli login` with `--social google\|github`, `--license free|pro`, `--use-device-flow` for headless machines (URL + one-time code entered in a browser elsewhere). Free plan: 50 credits/month. **Headless / API-key use is Pro+ only** — on Free, use interactive `kiro-cli chat` in the repo dir. |
| No AWS account needed | A personal entrant signs in with **social login or a free AWS Builder ID** (free personal profile, no credit card, no AWS account). Verified in kiro.dev docs and builder.aws.com: *"You do not need an AWS account to use Kiro."* |

### 1a. Which ID the 4,000 free Kiro credits request needs — READ THIS FIRST

The user is currently looking up his Kiro User ID and AWS account ID himself. Only one of
them matters for the hackathon credits:

- **The credits form needs the KIRO USER ID — NOT an AWS account ID.**
  Verified in the official kiro.dev billing docs: *"You can find your User ID in the usage
  dashboard. In the dashboard, your User ID is displayed next to your email address and
  sign-in method. Look for the 'User ID' label with a copy icon."* That is the ID to copy
  (from the usage dashboard at app.kiro.dev, after signing in).
- **The AWS account ID is for Enterprise / startup onboarding only** (team admins setting up
  IAM Identity Center, Kiro profiles per AWS account + Region, startup-credits activation).
  An individual hackathon entrant signing in with social login or AWS Builder ID **does NOT
  need an AWS account and should NOT create one or an Enterprise profile.** Do not steer the
  user toward AWS Console / IAM Identity Center / a Kiro console.
- Credits flow (per the Kiroween guide on aifree.dev — **secondary source, not verified on
  the Devpost page itself**, which sits behind sign-in): sign up at app.kiro.dev and copy
  the User ID from the usage dashboard → join the hackathon on Devpost → fill the credit
  form on the **Resources tab** (Devpost email, Kiro User ID, category, one line on what you
  will build) → **pass the Didit ID check** (government ID photo + selfie) that Devpost
  emails you → codes arrive within about 48 business hours; **log in to Kiro first, then
  open the code link**. Request by **1 Dec 2026 12:00 PT**; redeem by 4 Dec; credits expire
  31 Dec. The ID check is the user's step (KTP + selfie) — never done by Muse.

---

## 2. Exact /.kiro layout created

```
.kiro/
├── specs/payphantom/
│   ├── requirements.md   # 10 requirements (chat→invoice→paid→receipt), each with
│   │                     # acceptance criteria in EARS form (WHEN/THEN/SHALL)
│   ├── design.md         # architecture, API surface, receipt design decision,
│   │                     # contract sketch, error handling, testing strategy
│   └── tasks.md          # 18 implementation tasks in Kiro task-list format
│                         # (- [ ] / - [x]); tasks 1–16 marked done, 17 done
│                         # (contract compile), 18 open (end-to-end + demo video)
├── steering/
│   ├── product.md        # always: what PayPhantom is, user, free-only rules
│   ├── tech.md           # always: Node 24, Express 5, PayPal sandbox, Gemini
│   ├── structure.md      # always: repo layout, file responsibilities
│   └── security-policies.md  # always: no secrets, no paid mints without
│                         # approval, preview-before-sign, free-only rule
├── hooks/
│   └── quality-gates.json  # v1 schema: PostFileSave hook → scripts/hook-check-js.sh
│                         # (node --check on saved .js; always exit 0, never blocks)
└── settings/
    └── mcp.json          # workspace MCP config: one stdio server
                         # (scripts/mcp-payphantom.mjs, read-only tool
                         # receipt_gas_quote) — verified end to end
```

**Kiro concepts verified from kiro.dev docs (updated 2026-11-12):**
- **Specs** = `.kiro/specs/<name>/requirements.md, design.md, tasks.md` (three-phase workflow).
- **Steering** = `.kiro/steering/` foundation files `product.md`, `tech.md`, `structure.md`
  (always included by default) + custom files with front-matter inclusion modes
  (`always`, `fileMatch`, `manual`, `auto`); AGENTS.md also supported.
- **Hooks** = `.kiro/hooks/<id>.json`, schema `{version:"v1", hooks:[{name, trigger
  (PascalCase, e.g. PostFileSave, Stop), matcher (regex), action:{type:"command"|"agent",
  command|prompt}, timeout, enabled, confirm}]}`.
- **MCP** = workspace config `.kiro/settings/mcp.json`, user level `~/.kiro/settings/mcp.json`,
  format `{"mcpServers": {...}}` with stdio (command/args/env/disabled/autoApprove/
  disabledTools) and remote (url/headers/oauth/oauthScopes) servers; env vars use `${VAR}`
  and need approval.

---

## 3. App scaffold (Node + Express, new code reusing proven PayPilot patterns)

```
package.json            # express ^5.1.0, dotenv ^17.2.3, node >=24; scripts start/test
server.js               # /api/health, /api/chat, /api/invoices, /api/invoices/:id,
                        # mock-pay, /api/invoices/:id/receipt/quote,
                        # /api/invoices/:id/receipt/request, /api/receipts
lib/gemini.js           # Gemini REST gemini-3.6-flash, JSON mode; TODAY computed
                        # dynamically from server clock (Asia/Makassar) — fixes
                        # PayPilot's hard-coded-date bug
lib/paypal.js           # PayPal sandbox OAuth + Invoicing API v2 + mock; INV2- id
                        # extracted from the href (the PayPilot lesson)
lib/receipt.js          # receipt records PENDING/MOCK + read-only gas quotes via
                        # public BSC RPC; NEVER signs
lib/store.js            # in-memory Maps (invoices, receipts)
public/                 # chat UI: index.html, app.js, styles.css
contracts/src/PayPhantomReceipt.sol   # ERC-721 sketch (OpenZeppelin)
contracts/foundry.toml  # src="src", libs=["lib"]
contracts/.gitignore    # lib/ out/ cache/ (OpenZeppelin 17M + build output not committed)
scripts/hook-check-js.sh
scripts/mcp-payphantom.mjs
tests/smoke.test.js     # 3/3 pass
README.md, SUBMISSION-DRAFT.md, .env.example (placeholders only), LICENSE (MIT)
.gitignore              # node_modules, .env — does NOT ignore .kiro
```

**No `.env` file exists in the repo. No secrets anywhere (grep-verified).**

---

## 4. Receipt design decision (gas — read before building further)

The user's BNB wallet holds only **~0.000351 BNB** (checked 2026-11-13 ~09:50 WITA).
Minting is therefore **DEFERRED and OPTIONAL by design** (recorded in `lib/receipt.js` and
`design.md`):

- Every paid invoice gets a receipt record **immediately** (status PENDING for live mode,
  MOCK for the demo) — the product works end to end with zero BNB.
- The on-chain mint happens **later, only when the operator confirms it and the wallet can
  afford gas**. Planning estimate 150k gas; observed live BSC gas price 0.05 gwei at test
  time (≈0.0000075 BNB per mint — far below the conservative 1-gwei planning figure of
  ~0.00015 BNB). Even so, do **not** mint on the user's wallet without his explicit
  go-ahead for that exact gas cost, and never design the demo to require it.
- Alternative to decide later: payer-funded mint (payer pays the mint gas) — noted in
  design.md, not implemented.

---

## 5. Build plan — end-to-end flow

```
chat message (ID/EN)
  → lib/gemini.js parses → {payer, email, amount, currency, due, item}
  → lib/paypal.js creates PayPal sandbox invoice (Invoicing API v2)
  → invoice SENT, payment link shown in chat
  → payer pays (sandbox) / mock-pay in demo
  → POST /api/invoices/:id/receipt/request
  → receipt record created (PENDING live / MOCK demo)
  → [later, operator-confirmed] mintReceipt on BSC → tokenId + txHash attached
```

**Remaining tasks (tasks.md #18 + follow-ups):**
1. User signs in to Kiro himself (`kiro-cli login --social github` or google, or device flow).
2. Real sandbox invoice end to end (PayPilot's sandbox creds are in
   `~/workspace/paypal-hackathon/paypilot/.env` — reuse via env, never copy the values
   into this repo; PayPilot's Gemini key comes from the vault surrogate at runtime).
3. Contract: deploy to BSC testnet/mainnet only on the user's explicit go-ahead, with a
   gas preview first; first confirmed receipt mint.
4. Foundry test for the contract (mintReceipt happy path, duplicate-invoice revert,
   tokenURI shape) — stubbed in tasks.md #17.
5. Demo video <3 min on YouTube (public), Kiro write-up, GitHub push (public repo + OSI
   license + `/.kiro` at root), user submits on Devpost before 5 Dec 2026 06:00 WITA.

---

## 6. What still needs the user

1. **Devpost registration for Kiroween 2026** (his account; he submits himself).
2. **Kiro sign-in himself** — `kiro-cli login` (Google/GitHub social, or AWS Builder ID,
   or device flow). No account was created for him.
3. **4,000 free Kiro credits** — request on the Devpost **Resources tab by 1 Dec 2026
   12:00 PT** using his **Kiro User ID** (usage dashboard, next to email + sign-in
   method, copy icon) — **NOT an AWS account ID** (see §1a). Then pass the Didit ID check
   (KTP photo + selfie) that Devpost emails; redeem the code by 4 Dec (log in to Kiro
   first, then open the link). Credits expire 31 Dec.
4. **BNB top-up decision for receipt gas** — mint is deferred/optional by design (§4);
   decide only when a real mint is wanted.
5. **GitHub push + Devpost submit** — his submit button, as always.

---

## 7. Verification completed (2026-11-13)

- `npm install` added 66 packages in 5s; **`npm test` 3/3 pass** (mock invoice + store +
  mock-pay + MOCK receipt; live-mode receipt is PENDING with no tokenId/txHash; receipt
  quote shape).
- Server smoke run on port 3101: health OK (mock mode), chat without Gemini key replies
  gracefully, empty lists, 404s correct, UI serves.
- **MCP server works end to end** (initialize → tools/list → tools/call
  `receipt_gas_quote` returned a real quote).
- **Hook script works** (valid JS passes, broken JS reports the syntax error, non-JS
  ignored, always exit 0); hook + MCP JSON valid.
- **Contract compiles: `forge build` exit 0, 0 errors** (Foundry 1.9.0, solc 0.8.33,
  OpenZeppelin installed via `forge install ... --no-git`; artifact
  `out/PayPhantomReceipt.sol/PayPhantomReceipt.json`, 16,711 bytecode bytes, 19 ABI
  functions incl. `mintReceipt`, `receiptOf`, `tokenByInvoice`, `tokenURI`).
  - Two fixes during compile: contract moved to `contracts/src/` (foundry.toml
    `src="src"`, so forge no longer tries to compile OpenZeppelin's `fv/` harnesses);
    the 👻 in the SVG tokenURI needed a `unicode'...'` string literal.
  - One **accepted** lint warning remains: `encode-packed-collision` in `tokenURI`
    (fixed JSON separators make it unambiguous). A `reentrancy-events` warning was
    fixed by emitting `ReceiptMinted` before `_safeMint`.
- **No secrets found** (only `.env.example` placeholders); no `.env` file present.

## 8. What could NOT be verified

- **Kiro sign-in / credits** — no account exists yet; the Devpost Resources tab form
  fields and the Didit ID-check step are from a secondary guide (aifree.dev), not from
  the Devpost page itself (behind sign-in). The Kiro User ID location **is** verified
  from kiro.dev docs directly.
- **Live PayPal sandbox invoice through this app — VERIFIED 2026-11-13 ~10:15 WITA** (was §8, now done): two real sandbox invoices, both Sarah $120 USD consulting, status SENT with live payment URLs —
  - `INV2-T2B5-T3SD-A826-WHAK` (PP-MWECGSX5IMG5) via the server's `POST /api/chat` (Gemini parse → create → send → store);
  - `INV2-J8CW-NWJM-5QGT-R87X` (PP-MWECGMQX6KDM) via a direct `lib/paypal.js` run (create 1.9s, send 3.2s).
  Receipt quote verified read-only the same day: gas 0.05 gwei, est. 0.0000075 BNB/mint (150k gas), wallet 0.000351170955506082 BNB, affordable=true. Server ran live mode on port 3101, health `{"mode":"live","gemini":true,"paypal":"live"}`; creds injected via env vars only, no `.env` written to the repo. Test driver: `~/workspace/croll-check/payphantom-e2e.py` (superseded by the curl/direct runs), `payphantom-paypal-direct.mjs`, `payphantom-isolate.py`.
- **Gemini free-tier quota exhausted 2026-11-13 ~10:25 WITA** — REST returns **429**, resets ~16:00 WITA. The first live chat call also showed free-tier latency: the parse was so slow that curl hit its 150s limit even though the invoice was created. Use a longer client timeout for demo runs, and record the demo video AFTER the Housebets SEO Gemini leg (16:05, 6 calls) — the demo needs only 1–2 calls from the same shared 20/day quota.

## 8. What could NOT be verified

- **Kiro sign-in / credits** — no account exists yet; the Devpost Resources tab form
  fields and the Didit ID-check step are from a secondary guide (aifree.dev), not from
  the Devpost page itself (behind sign-in). The Kiro User ID location **is** verified
  from kiro.dev docs directly.
- **Contract deployment / real mint gas on BSC** — contract is a sketch; never deployed,
  no gas measured on-chain (only a public-RPC gas-price read: 0.05 gwei at test time).
- **PAID flip → PENDING receipt in live mode** — needs a sandbox payer to pay via the
  payment link; logic is code-verified in mock mode only (mock-pay → MOCK receipt, tests pass).
- **Whether relay-routed Kiro/Claude transcripts satisfy any Devpost/Kiroween
  "how Kiro was used" write-up** — the write-up is a text requirement, not a transcript
  gate like make.fun; still, keep the Kiro usage story honest (specs/hooks/MCP above
  are real Kiro artefacts).
- **`kiro-cli profile` as an alternate place to read the User ID** — untested (CLI is
  not signed in); the usage dashboard is the documented source.
