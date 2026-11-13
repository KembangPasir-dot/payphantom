# Requirements — PayPhantom

> Spec for the Kiroween 2026 Frankenstein entry. Status: scaffold (2026-11-13).
> The app is an AI chat agent that creates PayPal invoices (sandbox) and
> issues an on-chain NFT receipt on BNB Chain for each paid invoice.

## Introduction

PayPhantom stitches three systems that never meet in one product: an AI chat
agent (Gemini) that understands plain-language billing requests, PayPal
Invoicing (sandbox) that sends a real payable invoice, and BNB Chain, where
a receipt NFT proves the payment happened. A freelancer types "Tagih Budi
Rp500.000 untuk desain logo" and gets a sent invoice; when Budi pays, a
receipt NFT is recorded and (once the operator confirms and funds it) minted
on-chain. The receipt is the Frankenstein: Web2 money, Web3 proof, AI glue.

## Glossary

- **Invoice**: a PayPal invoice (sandbox in this build) created from a chat message.
- **Receipt / struk NFT**: an ERC-721 token (PayPhantomReceipt) whose on-chain
  metadata records invoice id, payer, amount, currency and paid time.
- **Deferred mint**: a receipt that is recorded first (PENDING) and minted
  on-chain later, only after the operator confirms it and the wallet holds
  enough BNB. The server never auto-signs a mint.
- **Mock mode**: the whole flow simulated with zero credentials and zero BNB
  (receipt status MOCK). The demo path.

## Requirements

### Requirement 1 — Chat understands billing requests

**User Story:** As a freelancer, I want to type a billing request in plain
Indonesian or English, so that I get a PayPal invoice without filling forms.

#### Acceptance Criteria

1. WHEN the user sends a message asking to bill someone THEN the system SHALL
   parse recipient name, recipient email, items with prices, currency and due
   date from the message.
2. WHEN the message is not a billing request THEN the system SHALL reply with
   a clarifying question and SHALL NOT create an invoice.
3. WHEN the recipient email is missing THEN the system SHALL ask for the email
   and SHALL NOT create an invoice.
4. WHEN the amount is missing THEN the system SHALL ask for the amount and
   SHALL NOT create an invoice.
5. WHEN the AI service is unconfigured or fails THEN the system SHALL reply
   gracefully over HTTP 200 and SHALL NOT crash.

### Requirement 2 — Invoice is created and sent via PayPal sandbox

**User Story:** As a freelancer, I want the parsed request to become a real
sent PayPal invoice, so that my client can pay it.

#### Acceptance Criteria

1. WHEN a parsed request is complete THEN the system SHALL create the invoice
   in PayPal sandbox and send it to the recipient.
2. WHEN PayPal rejects the request THEN the system SHALL surface PayPal's
   error message to the user and SHALL NOT crash.
3. WHEN PayPal credentials are absent THEN the system SHALL run in mock mode
   and simulate create + send with status SENT.
4. WHEN an invoice is created THEN the system SHALL store it and list it in
   the UI with number, recipient, total, due date, status and payment link.

### Requirement 3 — Payment status is tracked

**User Story:** As a freelancer, I want to know when an invoice is paid, so
that I can issue the receipt.

#### Acceptance Criteria

1. WHEN an invoice is opened in live mode THEN the system SHALL refresh its
   status from PayPal before showing it.
2. WHEN an invoice becomes PAID in live mode THEN the system SHALL create a
   PENDING receipt record for it exactly once.
3. WHEN running in mock mode THEN the system SHALL offer a mock-pay action
   that marks the invoice PAID and creates a MOCK receipt record.

### Requirement 4 — Receipt record for every paid invoice

**User Story:** As a freelancer, I want every paid invoice to produce a
receipt record, so that no payment is ever without proof.

#### Acceptance Criteria

1. WHEN an invoice is PAID THEN the system SHALL create exactly one receipt
   record carrying invoice id, invoice number, payer name/email, amount,
   currency and paid time.
2. WHEN the receipt is created in mock mode THEN its status SHALL be MOCK
   with a simulated tokenId.
3. WHEN the receipt is created in live mode THEN its status SHALL be PENDING
   with no tokenId and no txHash until an on-chain mint happens.
4. WHEN an invoice is not PAID THEN a receipt request for it SHALL be
   rejected with HTTP 409.

### Requirement 5 — Receipt minting is deferred and operator-confirmed

**User Story:** As the operator, I want minting to happen only when I confirm
it and the wallet can afford it, so that the app never spends BNB by itself.

#### Acceptance Criteria

1. WHEN the server runs THEN it SHALL never sign or broadcast a mint
   transaction on its own.
2. WHEN a receipt quote is requested THEN the system SHALL report gas units,
   current gas price, estimated BNB cost and whether the minter wallet can
   afford it, using read-only BSC RPC calls only.
3. WHEN the minter wallet balance is below the estimated cost THEN the quote
   SHALL report affordable = false.
4. WHEN the receipt contract is not yet deployed THEN the quote SHALL say it
   is a planning estimate and name the assumption (150k gas).

### Requirement 6 — No secrets in the repo

**User Story:** As the operator, I want zero credentials in the repository,
so that the public repo is safe to publish.

#### Acceptance Criteria

1. WHEN the repo is listed THEN it SHALL contain no .env file and no file
   holding an API key, client secret or private key.
2. WHEN the app starts THEN it SHALL read all credentials from environment
   variables only, and SHALL run in mock mode when they are absent.
3. WHEN the .gitignore is checked THEN it SHALL list .env and node_modules
   and SHALL NOT list .kiro (the Devpost rules require /.kiro in the repo).

### Requirement 7 — Demo-ready in mock mode

**User Story:** As a hackathon entrant, I want the full story demonstrable
with zero credentials and zero BNB, so that judges can run it.

#### Acceptance Criteria

1. WHEN the app runs with no credentials THEN the full flow (chat ->
   invoice -> mock-pay -> MOCK receipt) SHALL work end to end.
2. WHEN the health endpoint is called THEN it SHALL report ok, mode,
   Gemini status, PayPal mode and receipt mode.
3. WHEN the app is started with `npm install && npm start` THEN it SHALL
   serve the chat UI on the configured port.
