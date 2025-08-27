Finding and Reading Data
=======================


Reading from ledger
-------------------

.. todo:: improve writing of the text below

Parties and synchronizers are considered core on the Ledger API and therefore a filter on most requests.
To facilitate this change easily, the ledger controller
in the Wallet SDK allows you to change these, but forces them to be required for certain operations.
This is to ensure that you always have the correct context when reading data from the ledger.

.. literalinclude:: ../../examples/snippets/change-party-and-syncrhonizer.ts
    :language: typescript
    :dedent:

**Reading Available Parties**

Reading all available parties to you can easily be done using the wallet SDK, it is worth nothing that this is paginated however it does not have
any effect if you change the party or syncrhonizer you are using.

.. literalinclude:: ../../examples/snippets/list-wallets.ts
    :language: typescript
    :dedent:

**Reading Ledger End**

A lot of different requests will take a ledger offset to ensure the requested time correlates with ledger time. A Validator does not have a block height since
there is no total state replication. There are two values that well correlate:

* ledger time - this is the time the ledger choose when computing a transaction prior to commit.
* record time - this is the time assigned by the sequencer when registering the confirmation request.

Ledger time should be used for all operations in your local environment (that does not affect partners).
When doing reconciliation for transactions with partners or other members of a synchronizer it is better to use record time.

Ledger end can easily be derived from with the wallet SDK:

.. literalinclude:: ../../examples/snippets/list-wallets.ts
    :language: typescript
    :dedent:

**Reading Active Contracts**
Using the above ledger time we can figure out what the current state of all active contracts are. Contracts can be in two states, active and archived which correlates
to the UTXO mode of unspent and spent. Active contracts are contracts that are unspent and thereby can be used in new transactions or to exercise choices.

.. literalinclude:: ../../examples/snippets/read-active-contracts.ts
    :language: typescript
    :dedent:


Visualizing a Transaction
-------------------------

.. todo:: write section about using the transaction visualizer to represent a created event blob.
