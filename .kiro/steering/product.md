---
inclusion: always
---

# Product — PayPhantom

## What it is

PayPhantom is a Kiroween 2026 hackathon entry (Frankenstein category): an AI
chat agent that turns plain-language billing requests into PayPal invoices,
and mints an on-chain NFT receipt on BNB Chain for each paid invoice. Three
systems that never meet — AI chat, Web2 payments, Web3 proof — in one flow.

## Who it is for

Freelancers and small sellers who bill clients in chat and want a payment
receipt that cannot be faked, lost, or edited after the fact. The receipt
lives on BNB Chain; the invoice lives in PayPal.

## Core flow

1. User types a billing request in Indonesian or English.
2. Gemini parses it into a structured invoice (recipient, items, currency, due date).
3. PayPal sandbox creates and sends the invoice; the client pays it.
4. On payment, a receipt record is created (PENDING in live mode, MOCK in demo mode).
5. The operator confirms the on-chain mint later, once the wallet holds
   enough BNB. The server never signs or broadcasts a mint by itself.

## What it is NOT

- Not a payment processor: PayPal handles money; this app only creates invoices.
- Not a wallet: it never holds keys, never signs, never moves funds.
- Not a marketplace: receipts are proof of payment, not items for sale.
- Not live PayPal: this build targets the PayPal sandbox only.

## Success criteria

- The full flow works end to end in mock mode with zero credentials.
- One real sandbox invoice goes SENT, then PAID, then PENDING receipt.
- At least one receipt is minted on-chain (operator-confirmed) before submit.
- The demo video shows the whole story in under 3 minutes.
