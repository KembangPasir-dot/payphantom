# SUBMISSION DRAFT — PayPhantom (Kiroween 2026, Frankenstein)

> SUBMITTED 2026-11-13 ~20:55 WITA by Udin himself — live at https://devpost.com/software/payphantom (verified live: full About text, elevator pitch, video, repo link, category Frankenstein).

## Title

PayPhantom — invoices that come back from the dead as NFT receipts

## Tagline (one line)

Chat an invoice into existence on PayPal; when it is paid, its ghost
returns as an NFT receipt on BNB Chain.

## Category

Frankenstein — stitching Gemini (AI chat), PayPal (Web2 payments) and BNB
Chain (Web3 proof) into one app.

## Description (draft)

PayPhantom is an AI chat agent for freelancers. Type a billing request in
plain Indonesian or English — "Tagih Budi Rp500.000 untuk desain logo" —
and Gemini parses it into a structured invoice, PayPal sends it, and the
client pays it. That is the living half.

The dead half returns as a ghost: the moment an invoice is paid, PayPhantom
records a receipt and mints it as an ERC-721 NFT on BNB Chain. The receipt's
on-chain metadata carries the PayPal invoice id, payer, amount, currency
and paid time — a payment proof that cannot be faked, edited, or lost when
a server disappears. Because the operator wallet holds little BNB, minting
is deferred and operator-confirmed: the receipt is recorded first, and the
chain mint happens only when the operator confirms it and the wallet can
afford the gas. The app itself never signs.

Built with Kiro (see "How Kiro was used" below). Mock mode runs the whole
story with zero credentials and zero BNB.

## How Kiro was used (draft — complete after the build)

- **Specs:** the feature was planned as requirements → design → tasks in
  `.kiro/specs/payphantom/` before any code was written; implementation
  follows `tasks.md` wave by wave.
- **Steering:** `.kiro/steering/` holds product, tech, structure and
  security docs that are always on — the security file is why the public
  repo contains zero credentials.
- **Agent hooks:** `.kiro/hooks/quality-gates.json` runs `node --check` on
  every saved `.js` file and reminds the agent before finishing to run
  tests and check for staged secrets.
- **MCP:** a local stdio MCP server (`scripts/mcp-payphantom.mjs`)
  exposes `receipt_gas_quote`, letting the agent price a receipt mint
  from public BSC RPC without keys or signing.
- **Kiro CLI:** version 3.3.0, installed from `cli.kiro.dev`; sessions run
  with `kiro-cli chat` inside the repo so specs, steering, hooks and MCP
  all apply. Free-tier credits: 4,000 requested on the Devpost Resources
  tab (TODO: record the request date).

## Links (TODO)

- GitHub repo (public, MIT, /.kiro at root): TODO
- Live app URL: TODO
- Demo video (YouTube, public, <3 min): RECORDED 2026-11-13 ~20:15 WITA — `demo/payphantom-demo.mp4` (52.8s). UPLOADED + PUBLISHED 2026-11-13 ~20:40 WITA: https://www.youtube.com/watch?v=IZawQHFWfuk (channel Aly @alioelyn, Public, 0:52).

## Bonus prizes (consider)

- **Social Blitz:** post with #KiroweenHackathon26 at the start, link the
  post URL in the submission. TODO: publish + record URL.
- **Bonus Blog:** public blog post about Kiro + this project on a
  third-party platform, link it in the submission. TODO.
