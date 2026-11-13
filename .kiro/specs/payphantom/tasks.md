# Tasks — PayPhantom

> Spec for the Kiroween 2026 Frankenstein entry. Deadline: submit on Devpost
> by Sat 5 Dec 2026 06:00 WITA (Fri 4 Dec 14:00 PT).
> Status markers: `- [x]` done in the 2026-11-13 scaffold, `- [ ]` remaining.
> Waves: tasks in one wave are independent and can run in parallel.

## Wave 1 — Scaffold (done 2026-11-13)

- [x] 1. Research Kiro (install, auth, specs, steering, hooks, MCP) from kiro.dev
- [x] 2. Install Kiro CLI 3.3.0 on the VM (no account, no sign-in, no payment)
- [x] 3. Create the repo skeleton (package.json, .gitignore, .env.example, LICENSE, README)
- [x] 4. Write the app: server.js + lib/gemini.js + lib/paypal.js + lib/receipt.js + lib/store.js + public/ (new code, PayPilot patterns)
- [x] 5. Write the receipt contract sketch (contracts/src/PayPhantomReceipt.sol)
- [x] 6. Write the .kiro tree: specs (requirements/design/tasks), steering (product/tech/structure/security), hooks (quality-gates.json), settings/mcp.json
- [x] 7. Write the MCP server (scripts/mcp-payphantom.mjs) + hook helper (scripts/hook-check-js.sh) and smoke tests (tests/smoke.test.js)
- [x] 8. Verify: npm install, npm test, mock-mode end-to-end run, MCP tool call, hook script run
- [x] 9. Write HANDOFF.md (install/auth status, build plan, user-needed items)

## Wave 2 — Kiro sign-in + credits (user; blocks agent use of Kiro)

- [x] 10. User signs in to Kiro: `kiro-cli login --social github` (or google), or `--use-device-flow` on a headless machine (DONE 2026-11-13 ~10:13 WITA: signed in on the WEB at app.kiro.dev with Google as alioelyn@gmail.com — Free plan, 50 credits/month, 0 used, resets 12/01. CLI login on the VM still pending — see task 13)
- [ ] 11. User registers for Kiroween 2026 on Devpost (his own Devpost account)
- [x] 12. User requests the 4,000 free Kiro credits on the Devpost Resources tab (by 1 Dec 2026 12:00 PT, FCFS; redeem by 4 Dec, expire 31 Dec) (DONE 2026-11-13: form submitted ~10:25 WITA, Didit identity check VERIFIED ~13:11 WITA. REDEEMED ~13:30 WITA via browser (Google sign-in alioelyn@gmail.com): green banner "Kiroupon successfully redeemed! Bonus credits were added to your account." BUT the Usage page shows only the Free plan 50 credits (0 used) — no numeric 4,000 bonus balance visible; re-opening the link failed "Redemption Failed" (code already used, single-use). Bonus balance to be confirmed on first Kiro use. CONFIRMED 2026-11-13 ~13:32 WITA via Udin's screenshot of Account & plan: "Additional credits — Bonus credits: kiroween-20-26, 0 / 4000". Expires 31 Dec 2026.
- [x] 13. Verify in the repo: `kiro-cli whoami` shows the signed-in account; `kiro-cli chat` opens in the repo dir and reads .kiro/steering (DONE 2026-11-13 ~10:19 WITA: device-flow login approved by Udin on his phone, code MCJR-MTHQ; `kiro-cli whoami` → "Logged in with Builder ID, Email: alioelyn@gmail.com". `kiro-cli chat` in the repo dir still to be tried)

## Wave 3 — Live PayPal sandbox end-to-end

- [x] 14. Set PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET (sandbox app) + PAYPAL_MOCK=false (DONE 2026-11-13: injected via env vars at runtime from PayPilot's .env + vault Gemini surrogate — NO .env file written into the repo, by design, so no secrets live here)
- [x] 15. Run one real sandbox invoice end to end (chat -> create -> send -> verify SENT on PayPal), record the invoice id (DONE 2026-11-13 ~10:15 WITA: TWO live sandbox invoices — INV2-T2B5-T3SD-A826-WHAK via the server's /api/chat, and INV2-J8CW-NWJM-5QGT-R87X via a direct lib/paypal.js run; both Sarah $120 USD consulting, status SENT, paymentUrl live. Receipt quote verified read-only the same day: 0.05 gwei, ~0.0000075 BNB/mint, wallet 0.000351 BNB, affordable=true)
- [ ] 16. Verify status refresh flips an invoice to PAID after sandbox payment and creates exactly one PENDING receipt (BLOCKED 2026-11-13: needs a sandbox payer to pay via the payment link; the PENDING-record-on-PAID logic is code-verified in mock mode only. NOTE: the first live chat call took so long on Gemini free-tier latency that curl hit its 150s limit — invoice was created anyway; use a longer client timeout for demo runs. Gemini quota then hit 429 — see task 26)

## Wave 4 — Receipt contract: deploy + verify

- [x] 17. Compile contracts/src/PayPhantomReceipt.sol with Foundry (DONE 2026-11-13: `forge build` exit 0, 0 errors; 1 accepted lint warning `encode-packed-collision` in tokenURI — JSON separators make it unambiguous); add a Foundry test (mintReceipt happy path, duplicate-invoice revert, tokenURI shape)
- [ ] 18. Deploy to BSC (testnet first, then mainnet only on the operator's explicit go-ahead) and verify on BscScan
- [ ] 19. Record the deployed address in .env (RECEIPT_CONTRACT_ADDRESS) and in lib/receipt.js; replace the 150k-gas planning estimate with eth_estimateGas against the deployed contract
- [ ] 20. Decide the mint funding: operator top-up (how much BNB) vs payer-funded vs batch; record the decision in design.md

## Wave 5 — First real receipt mint (operator-confirmed)

- [ ] 21. Generate a mint preview (contract, function, args, value 0, gas estimate, balance changes) for one PENDING receipt and show it to the operator
- [ ] 22. Operator confirms that exact preview; execute the mint; verify on-chain (ownerOf, tokenURI, receiptOf) and flip the record to MINTED with txHash
- [ ] 23. Capture the mint for the demo video (screen recording of the receipt card going PENDING -> MINTED)

## Wave 6 — Polish, video, submit

- [ ] 24. Polish the UI (spooky Frankenstein touches, receipt cards show token + BscScan link once minted)
- [ ] 25. Write the Devpost submission text (SUBMISSION-DRAFT.md -> final) + the "how Kiro was used" write-up (specs, steering, hooks, MCP, credits)
- [ ] 26. Record the demo video (<3 min, public on YouTube): chat -> invoice -> pay -> receipt, plus the Kiro surfaces used (BLOCKED 2026-11-13 ~10:25 WITA: Gemini free-tier quota exhausted — REST returns 429, resets ~16:00 WITA. The quota is shared account-wide with the Housebets SEO Gemini leg scheduled 16:05 the same day (6 calls); do the demo recording AFTER that leg, it needs only 1–2 calls)
- [ ] 27. Push the repo to public GitHub (KembangPasir-dot) with OSI license + /.kiro at root (NOT gitignored); verify the repo renders
- [ ] 28. User submits on Devpost himself (repo link, app URL, description, video, category Frankenstein) before 5 Dec 06:00 WITA
