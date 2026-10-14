---
title: 'Transfer Types'
description: 'Two-step vs one-step transfers / pre-approvals, accepting/rejecting/withdrawing two-step transfers, and transfer pre-approvals.'
---

## Two-step transfer vs one-step transfer

The default behavior for all tokens are a two-step transfer, this matches how funds are usually transferred in TradFi, however this is counter-intuitive in the blockchain world. Canton Coin supports setting up a "Transfer Pre-approval", this allows a party to designate that he wants to auto-accept all incoming transfer, giving a similar behavior of the blockchain world.

[`snippets/create-transfer-preapproval.ts`](../../examples/snippets/create-transfer-preapproval.ts) <!-- include -->

## Accepting or rejecting a two-step transfer

If no Transfer pre-approval have been set up, then it is required to fetch incoming transfer instructions and consume either the `Accept` or `Reject` choice, this can be done easily using the Wallet SDK.

[`snippets/read-pending-transfer-instructions.ts`](../../examples/snippets/read-pending-transfer-instructions.ts) <!-- include -->

the above give a list of pending transfer instructions, you can then exercise the accept or reject choice on them:

[`snippets/accept-or-reject-transfer.ts`](../../examples/snippets/accept-or-reject-transfer.ts) <!-- include -->

## Withdrawing a two-step transfer before it gets accepted

Apart from accepting or rejecting a transfer instruction, it is also possible for the sender to `withdraw` the offer, thereby retrieving the locked funds.

[`snippets/withdraw-transfer-instruction.ts`](../../examples/snippets/withdraw-transfer-instruction.ts) <!-- include -->

## How do I quickly setup transfer preapproval?

It is worth nothing that using the validator operator party as the providing party causes the transfer pre-approval to auto-renew. The below script setup transfer preapproval for Bob and performs a one-step transfer from Alice to Bob:

[`scripts/05-preapproval.ts`](../../examples/scripts/05-preapproval.ts) <!-- include -->

## How to renew or cancel a transfer preapproval

If you have used the validator operator party as the provider, then it will automatically renew the transfer preapproval approximately 20 days before expiry, however there are cases where you would like to perform the preapproval renewal manually:

```typescript
await amulet.preapproval.renew({
    parties: {
        receiver: myPartyId,
    },
    expiresAt: newExpiresAt,
})
```

You can also deploy a secondary transfer preapproval, however this means that there are simply two preapprovals instead of it replacing the existing.

If you have accidentally created a transfer preapproval that you dont want to keep you can perform a cancel instead:

```typescript
const [cancelPreapprovalCommand, cancelDisclosedContracts] =
    await amulet.preapproval.command.cancel({
        parties: {
            receiver: myPartyId,
        },
    })
await sdk.ledger
    .prepare({
        partyId: myPartyId,
        commands: cancelPreapprovalCommand,
        disclosedContracts: cancelDisclosedContracts,
    })
    .sign(myPrivateKey)
    .execute({
        partyId: myPartyId,
    })
```
