---
title: 'Approve & Sign Transactions'
description: 'Review, approve, and track the transactions dApps ask the Wallet Gateway to run.'
---

When a dApp wants to act on your behalf, it does not sign anything itself. It asks the Wallet
Gateway to run a transaction, and the Wallet Gateway routes it to you for approval and to your
signing provider for signing. This keeps approval and key custody under your control: private
keys never reach the dApp. This guide covers what you see on the **Approve** page, how to
approve or reject, and how to track a transaction afterwards.

## How a transaction reaches you

A dApp submits a transaction through the [dApp SDK](../../dapp-sdk/overview.md), which
calls the Wallet Gateway's dApp API. The Wallet Gateway prepares it against your validator,
queues it for your approval, has your signing provider sign it, and submits it to the ledger.

```mermaid
sequenceDiagram
    participant D as dApp
    participant WG as Wallet Gateway
    participant UI as User UI (Approve)
    participant S as Signing provider
    participant L as Ledger API

    D->>WG: prepareExecute
    WG->>L: prepare
    L-->>WG: prepared transaction
    WG->>UI: queue for approval
    Note over UI: You review and Approve
    UI->>WG: approved
    WG->>S: sign
    S-->>WG: signed transaction
    WG->>L: execute
    L-->>WG: completion
    WG-->>D: result
```

The dApp learns the outcome through the `txChanged` event, so once you approve and the
transaction executes, the dApp updates on its own.

## Review a transaction

When a dApp requests a transaction, the Wallet Gateway takes you to the **Approve** page of the particular transaction (it may
open in a popup window if the dApp triggered it). There you can see:

- The **wallet** (party) the transaction will act as.
- The **network** it will be submitted to.
- The **transaction details** the dApp prepared, so you can confirm it matches what you expect.

![transaction detail](images/detail.png)

## Approve or reject

- **Approve** — the Wallet Gateway hands the prepared transaction to the wallet's
  [signing provider](../operate/signing-providers.md), which signs it,
  and then submits it to the ledger. The dApp is notified of the result.
- **Reject** — the Wallet Gateway discards the request and notifies the dApp that you declined.
  Nothing is signed or submitted.

If the **Approve** page opened as a popup, it closes and returns you to the dApp after you
decide.

If you accidentally closed the pop-up and lost the transaction approval page, reopen the User UI and navigate to **Activities** to review the transactions.

![approve or reject a transaction](images/approveDetail.png)

> [!WARNING]
> Only approve transactions you understand and expect. Approving signs with your wallet's key
> through its signing provider and submits to the ledger — it cannot be undone. If anything looks
> wrong, reject it.

## Where signing happens

Signing is delegated per wallet to the signing provider you chose when you created it — a
participant node, an external custody provider (Fireblocks, Blockdaemon, DFNS), or the internal
store for development. Your keys stay with that provider; approving in the UI authorizes the
provider to sign, but the key never passes through the dApp or the browser. See
[Signing providers](../operate/signing-providers.md).

## Track a transaction

Open the **Transactions** page to follow a transaction through its lifecycle and inspect its
details. Each transaction moves through these states:

| Status       | Meaning                                                       |
| ------------ | ------------------------------------------------------------- |
| **Pending**  | Prepared and waiting for your approval.                       |
| **Signed**   | Approved and signed by the signing provider, being submitted. |
| **Executed** | Submitted to the ledger and completed successfully.           |
| **Failed**   | Rejected, or failed during signing or submission.             |

Use this page to confirm a transaction executed, or to see why one failed. If executions fail
to start or never complete, see
[Troubleshooting](../operate/troubleshooting.md).

## Next steps

- [Party management](party-management.md): Log in and create, organize, and remove wallets in the User UI.
- [Automate with the User API](../automation/automate-with-user-api.md): Sign and execute transactions programmatically.
- [Signing providers](../operate/signing-providers.md): Choose where signing and key custody happen.
- [dApp API](../reference/dapp-api.md): See how dApps request transactions through the dApp API.
