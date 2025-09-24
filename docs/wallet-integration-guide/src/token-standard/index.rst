..
   Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
..
   SPDX-License-Identifier: Apache-2.0

.. #TODO: copy of https://raw.githubusercontent.com/hyperledger-labs/splice/3c0770e648b21a48ef8dde202ef27065592f9422/docs/src/deployment/traffic.rst

.. _token_standard:

Token Standard
==============

The Wallet SDK support performing basic token standard operations, these are exposed through the `sdk.tokenStandard` a complete
overview of the underlying integration can be found `here <https://docs.sync.global/app_dev/token_standard/index.html#>` and the CIP
is defined `here <https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md>`.


How do i quickly perform a transfer between two parties?
--------------------------------------------------------

The below performs a 2-step transfer between Alice and Bob and expose their holdings:

.. literalinclude:: ../../examples/scripts/04-token-standard-localnet.ts
    :language: typescript
    :dedent:

Listing holdings (UTXO's)
-------------------------

Canton uses created and archived events to determine the state of the ledger. This correlates to how UTXO's are handled on other blockchains
like Bitcoin. This means that at any point in time you can retrieve all your active contracts with the interface 'Holding' to see all assets
you posses across different instruments.

.. literalinclude:: ../../examples/snippets/list-holdings.ts
    :language: typescript
    :dedent:

the above script can safely be used to determine used in a transfer, if you provide no boolean value or true then you need to filter
out the locked ones manually.

Listing holding transactions
----------------------------

In order to stream transaction events as they happen on ledger the `listHoldingTransactions` endpoint can be used. This takes two ledger
offset and gives an overview of all token standard transactions that have happened between. It also returns a `nextOffset` that can be used
when calling the endpoint again. This will allow you to easily ensure you do not receive any transaction twice and you are only querying the
transactions that have happened after.


.. literalinclude:: ../../examples/snippets/monitor-transaction-holding.ts
    :language: typescript
    :dedent:


to quickly convert the stream into deposit and withdrawal you can use this function:

.. code-block:: javascript

    function convertToTransaction(pt: Transaction, associatedParty: string): object[] {
        return pt.events.flatMap((event) => {
            if (event.label.type === 'TransferIn') {
                return [{
                    updateId: pt.updateId,
                    recordTime: pt.recordTime,
                    from: event.label.sender,
                    to: associatedParty,
                    amount: Number(event.unlockedHoldingsChangeSummary.amountChange),
                    instrumentId: 'Amulet', //hardcoded instrumentId from local net
                    fee: Number(event.label.burnAmount),
                    memo: event.label.reason,
                }];
            } else if (event.label.type === 'TransferOut') {
                const label = event.label
                return event.label.receiverAmounts.map((receiverAmount: any) => ({
                    updateId: pt.updateId,
                    recordTime: pt.recordTime,
                    from: associatedParty,
                    to: receiverAmount.receiver,
                    amount: Number(receiverAmount.amount),
                    instrumentId: 'Amulet', //hardcoded instrumentId from local net
                    fee: Number(label.burnAmount),
                    memo: label.meta.reason,
                }));
            } else {
                return [];
            }
        });
    }

Performing a Tap on DevNet or LocalNet
--------------------------------------
When writing scripts and setup it is important to have funds present, this can be very tedious on blockchains. Therefor
most blockchains support some form of a faucet (that allows to receive a small amount of funds to play with). On canton
we allow the `tap` method that is only present on DevNet (or LocalNet), by using this you can stock funds to easily attempt
some of the CC transfer flows:

.. literalinclude:: ../../examples/snippets/tap-coins.ts
    :language: typescript
    :dedent:

this is an important pre-requisite for the creating of transfer in your script.

Creating a transfer
-------------------

In order to create a simple transfer you can use the `createTransfer` on the token standard. Then like any other operation
you can the `prepareSubmission` endpoint, sign the returned hash and finally `executeSubmission`.

.. TODO: ADD SCRIPT

UTXO management and locked funds
--------------------------------

The default script for creating a transfer above uses automated utxo selection, the automatic being to simply select all utxo's.
In a more professional you would want to carefully pick which utxo's you would like to use as input for your transfers, alongside
you might also want to define a custom expiration time for when the transaction should automatically expire.

.. TODO: ADD SCRIPT

2-step transfer vs 1-step transfer
----------------------------------

The default behavior for all tokens are a 2-step transfer, this matches how funds are usually transferred in TradFi, but it is
counter-intuitive in the blockchain world. Canton Coin and potentially other token standard can


Accepting or rejecting a 2-step transfer
----------------------------------------

Withdrawing a 2-step transfer before it gets accepted
-----------------------------------------------------



