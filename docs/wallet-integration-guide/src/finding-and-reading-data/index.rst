Finding and Reading Data
=======================


Reading from ledger
-------------------

.. todo:: improve writing of the text below

Parties and synchronizers are considered a core component on the Ledger API and they are therefore a common filter on requests.
To facilitate the party and synchronizer fields to be changed easily, the ledger controller in the Wallet SDK allows you to change
the fields but requires them for certain operations. 
This is to ensure that you always have the correct context when reading data from the ledger.

.. literalinclude:: ../../examples/snippets/change-party-and-syncrhonizer.ts
    :language: typescript
    :dedent:

**Reading Available Parties**

Reading all available parties to you can easily be done using the wallet SDK as shown in the example below, and the result is paginated. 
It's worth noting that the call to read all available parties doesn't use the the party and synchronizer fields therefore changing them has no effect on the result.

.. literalinclude:: ../../examples/snippets/list-wallets.ts
    :language: typescript
    :dedent:

**Reading Ledger End**

A lot of different requests will take a ledger offset to ensure the requested time correlates with ledger time. A Validator does not have a block height since
there is no total state replication. There are two values that correlate:

* ledger time - this is the time the ledger chooses when computing a transaction prior to commit.
* record time - this is the time assigned by the sequencer when registering the confirmation request.

Ledger time should be used for all operations in your local environment (that does not affect partners).
When doing reconciliation for transactions with partners or other members of a synchronizer it is better to use record time.

Ledger end can easily be derived from with the wallet SDK:

.. literalinclude:: ../../examples/snippets/read-ledger-end.ts
    :language: typescript
    :dedent:

**Reading Active Contracts**

Using the above ledger time we can figure out what the current state of all active contracts are. Contracts can be in two states - active and archived - which correlates
to the UTXO mode of unspent and spent. Active contracts are contracts that are unspent and thereby can be used in new transactions or to exercise choices.

.. literalinclude:: ../../examples/snippets/read-active-contracts.ts
    :language: typescript
    :dedent:

.. _visualizing-a-transaction:
Visualizing a Transaction
-------------------------

.. todo:: write section about using the transaction visualizer to represent a created event blob.
