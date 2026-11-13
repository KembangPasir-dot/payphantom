// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// PayPhantomReceipt — SKETCH (not audited, not deployed).
// An ERC-721 "payment receipt" NFT on BNB Chain: one token per PAID PayPal
// invoice. The on-chain metadata records the PayPal invoice id, payer,
// amount, currency and paid time, so anyone can verify the payment from
// the chain alone.
//
// DESIGN NOTES
// - Only the contract owner (the PayPhantom operator wallet) may mint.
//   The app server NEVER holds the owner key and never signs: minting is
//   operator-confirmed, one preview per mint (see .kiro/specs/payphantom/).
// - tokenURI is fully on-chain (base64 JSON, no IPFS): the receipt survives
//   even if every website showing it disappears.
// - Tokens are transferable ERC-721s. The invoiceId in the metadata is the
//   source of truth; transferring the token does not rewrite history.
// - Gas: a mint with on-chain JSON metadata costs roughly 120-150k gas.
//   At 1 gwei that is ~0.00012-0.00015 BNB per receipt. The operator wallet
//   must hold BNB before minting (deferred-mint design).
//
// TODO (build phase): deploy to BSC with Foundry, verify on BscScan,
// replace the planning estimate in lib/receipt.js with eth_estimateGas
// against the deployed contract, and record the address in .env.

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract PayPhantomReceipt is ERC721, Ownable {
    using Strings for uint256;

    struct Receipt {
        string invoiceId; // PayPal invoice id, e.g. INV2-....
        string invoiceNumber; // human invoice number, e.g. PP-....
        string payerEmail;
        uint256 amount; // smallest unit of the invoice currency (cents / rupiah)
        string currency; // "IDR" | "USD"
        uint256 paidAt; // unix timestamp of the payment
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 => Receipt) private _receipts;
    mapping(string => uint256) private _tokenByInvoice;

    event ReceiptMinted(
        uint256 indexed tokenId,
        address indexed to,
        string invoiceId,
        uint256 amount,
        string currency
    );

    constructor() ERC721("PayPhantom Receipt", "PPR") Ownable(msg.sender) {}

    /// @notice Mint one receipt for a paid invoice. Owner only.
    /// @dev Reverts if this invoice already has a receipt (one per invoice).
    function mintReceipt(
        address to,
        string calldata invoiceId,
        string calldata invoiceNumber,
        string calldata payerEmail,
        uint256 amount,
        string calldata currency,
        uint256 paidAt
    ) external onlyOwner returns (uint256 tokenId) {
        require(bytes(invoiceId).length > 0, "empty invoiceId");
        require(_tokenByInvoice[invoiceId] == 0, "receipt exists");
        tokenId = _nextTokenId++;
        _receipts[tokenId] = Receipt({
            invoiceId: invoiceId,
            invoiceNumber: invoiceNumber,
            payerEmail: payerEmail,
            amount: amount,
            currency: currency,
            paidAt: paidAt
        });
        _tokenByInvoice[invoiceId] = tokenId;
        emit ReceiptMinted(tokenId, to, invoiceId, amount, currency);
        _safeMint(to, tokenId);
    }

    function receiptOf(uint256 tokenId) external view returns (Receipt memory) {
        require(_ownerOf(tokenId) != address(0), "no such token");
        return _receipts[tokenId];
    }

    function tokenByInvoice(string calldata invoiceId) external view returns (uint256) {
        return _tokenByInvoice[invoiceId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "no such token");
        Receipt memory r = _receipts[tokenId];
        bytes memory json = abi.encodePacked(
            '{"name":"PayPhantom Receipt #',
            tokenId.toString(),
            '","description":"On-chain payment receipt for PayPal invoice ',
            r.invoiceId,
            ' (',
            r.invoiceNumber,
            '). Paid ',
            r.amount.toString(),
            " ",
            r.currency,
            ' by ',
            r.payerEmail,
            '.","attributes":[{"trait_type":"invoice","value":"',
            r.invoiceId,
            '"},{"trait_type":"currency","value":"',
            r.currency,
            '"},{"trait_type":"amount","value":"',
            r.amount.toString(),
            '"}],"image":"data:image/svg+xml;base64,',
            Base64.encode(
                bytes(
                    string(
                        abi.encodePacked(
                            unicode'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#0d0b1e"/><text x="200" y="120" font-size="72" text-anchor="middle">👻</text><text x="200" y="200" font-size="24" fill="#f2f0ff" text-anchor="middle">PayPhantom Receipt</text><text x="200" y="240" font-size="18" fill="#b9b3e8" text-anchor="middle">',
                            r.invoiceNumber,
                            "</text></svg>"
                        )
                    )
                )
            ),
            '"}'
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(json)));
    }
}
