---
inclusion: always
---

# Security — PayPhantom

## Hard rules (never break these)

1. **No secrets in the repo. Ever.** No API keys, client secrets, private
   keys, mnemonics, session tokens or passwords in any file — code, docs,
   steering, specs, tests, or comments. Credentials live only in `.env`
   (gitignored) or in the operator's own vault.
2. **`.env` is gitignored and `.kiro` is not.** The Devpost rules require
   `/.kiro` in the public repo; the same rules forbid leaking credentials.
   Before every commit, check `git status` for `.env` and re-check that no
   key was pasted into a file.
3. **Sandbox only.** This build talks to the PayPal *sandbox* and to BSC
   public RPC *read-only* endpoints. No live PayPal, no mainnet signing.
4. **The server never signs.** No private key is ever loaded, no mint is
   ever broadcast by this app. On-chain minting is a separate,
   operator-confirmed step with its own preview (see `design.md`).
5. **Never log credentials.** Never `console.log` an API key, a token, or
   a full `.env`. Error messages may include a PayPal status code and the
   first 300 chars of a response body — never an Authorization header.
6. **User data stays minimal.** The app stores invoice recipient names,
   emails, amounts and receipt metadata (needed for the receipt itself).
   Nothing else. No tracking, no analytics, no third-party beacons.

## Before every commit (also enforced by the Stop hook)

- `npm test` passes (or the failure is understood and recorded).
- `git diff` contains no string that looks like a key, token or secret.
- `.env` is not staged; `.kiro/` is staged (it must ship in the repo).
