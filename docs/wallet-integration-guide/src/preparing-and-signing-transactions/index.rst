Preparing and Signing Transactions Using External Party
==========================================================

.. TODO figure out what trust assumptions should be aboue
.. trust assumptions
.. -----------------

High-level Signing Process
--------------------------
The basic steps of preparing and signing a transaction using an external party are as follows:

1. **Creating a command** - You start by simply creating a command.
2. **Preparing the transaction** - You send the command to the blockchain RPC, offered by your node, to prepare the transaction.
3. **Validating the transaction** - You inspect the transaction and decide whether to sign it.
4. **Signing the transaction** - Once validated, you sign the transaction hash using your private key (typically with ECDSA/EdDSA).
5. **Submitting the transaction** - You submit the signed transaction to be executed.
6. **Observing the transaction** - You observe the blockchain until the transaction is committed.

In the examples below, the SDK examples use the Pint app which comes pre-installed with the validator
and the cURL examples show the underlying HTTP requests using Canton Coin following a token standard transfer.

How do I quickly execute a Ping?
----------------------------------------

Below shows how to quickly execute a ping command against yourself on a running Splice LocalNet:

.. literalinclude:: ../../examples/scripts/03-ping-localnet.ts
    :language: typescript
    :dedent:


Creating a Command
------------------
Commands are the intents of an user on the validator, there are two kinds of commands: ``CreateCommand`` and ``ExerciseCommand``.

The ``CreateCommand`` is used to create a new implementation of a template with the given arguments and can result in one or more
new contracts being created. The ``ExerciseCommand`` takes an existing contract and exercises a choice on it, which also can
result in new contracts being created.

In the Canton Network, it is often necessary to need to include input data when creating commands which needs to be read from the ledger.
For example, which UTXOs to include in a transfer.
This is private data which you read from your own node.
It's also often necessary to include contextual information in a transfer.
For example, information about a particular asset which you don't get from your own node - you get from an API provided by the asset issuer.
See `here <https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md>` for more information.

The general process for forming a transaction is:

1. Call your own node's RPC to get the current ledger end (think “latest block”)
2. Call your own node's RPC to get relevant private data at ledger end (e.g. wallet's holdings)
3. Call app/token specific APIs to get context information (e.g. mining round contracts)
4. Assemble the data into the full command using the OpenAPI/JSON or gRPC schemas.


In the examples below, the SDK example uses the Token Standards inside the a validator to create a simple transfer command.
The transfer command is sent to a recipient party who can then exercise `accept` or `reject` on the created contract (thereby archiving it).
In the cURL example, we show the steps above gaining information from a validator and context information from the Canton Coin scan API.

The Wallet SDK allow us to build such a command easily:

..
    Often commands need input data that you need to read from the ledger. E.g.:
    Which holding UTXOs to use in a transfer.
    Context information about the current mining round.
    Some of this - private data - you get from your own node, some of it from other nodes.

    So the general process is:


.. tabs::

    .. tab:: SDK

        .. literalinclude:: ../../examples/snippets/create-transfer-command.ts
            :language: typescript
            :dedent:

    .. tab:: cURL

        .. literalinclude:: ../../examples/bash/create-command.sh
            :language: bash
            :dedent:


Preparing the Transaction
-------------------------
Now that we have a command we need to prepare the transaction by calling a node's RPC API which will return an unsigned transaction.
It must be a validator which hosts the party initiating the transaction as private information is needed to construct the transaction.
This is unlike other chains where you construct the transaction fully offline using an SDK.
A transaction is a collection of commands that are atomic, meaning that either all commands succeed or none of them do.

Note: contractId's are pinned as part of prepare step, the execution of the transfer will only go succeed if the contractId's haven't been archived between preparation and execution steps.

To prepare a transaction we need to send the commands to the ledger.

.. tabs::

    .. tab:: SDK

        .. literalinclude:: ../../examples/snippets/prepare-transfer-transaction.ts
            :language: typescript
            :dedent:

    .. tab:: cURL

        .. literalinclude:: ../../examples/bash/prepare-transaction.sh
            :language: bash
            :dedent:

The return type is an unsigned transaction if the combination of the commands are possible, otherwise an error is returned. The transaction can then be visualised and signed by the party.

Validating the Transaction
--------------------------
The result from the prepare step is an encoded protobuf message and easily decoded and inspected to go through a policy engine, for example.
The transaction is returned alongside with the hash that needs to be signed. If the validator is not controlled by you, then it might
be a good idea to validate that the transaction is what you expect it to be. You can use the Wallet SDK to visualize the transaction
as described in the :ref:`Visualizing a transaction section <visualizing-a-transaction>`.

On top of visualizing the transaction, it's also important to compute the transaction hash yourself and confirm that it matches the hash of the transaction provided by the validator from the prepare step.

.. TODO: Add the alternative method for this step and those below

The hash can be computed using the Wallet SDK:

.. literalinclude:: ../../examples/snippets/compute-transaction-hash.ts
    :language: typescript
    :dedent:

You can then compare the `hash` with the `transaction.preparedTransactionHash` to ensure they match.

Signing the Transaction
-----------------------
Once the transaction is validated, the hash retrieved from the prepare step can be signed using the private key of the party.

Below shows an example in the Wallet SDK and using cURL commands:

.. tabs::

    .. tab:: SDK

        .. literalinclude:: ../../examples/snippets/sign-transaction-hash.ts
            :language: typescript
            :dedent:

    .. tab:: cURL

        .. literalinclude:: ../../examples/bash/sign-transaction-hash.sh
            :language: bash
            :dedent:


Submitting the Transaction
--------------------------

Once the transaction is signed, it can be executed on the validator.
You can observe completions by seeing the committed transactions.
If they don't appear on your ledger, you are guaranteed some response, and you can keep retrying; signed transactions are idempotent.
Finality usually takes 3-10s.

.. tabs::

    .. tab:: SDK

        .. literalinclude:: ../../examples/snippets/execute-transaction.ts
            :language: typescript
            :dedent:

    .. tab:: cURL

        .. literalinclude:: ../../examples/bash/execute-transaction.sh
            :language: bash
            :dedent:


Observing the Transaction
-------------------------

There are two ways to observe the transaction you have submitted. You can either:

1. continuously monitor holdings changes using :ref:`token standard history parser <list-holding-transactions>`.
2. use WaitFor to get the updateId and retrieve the transaction:

.. literalinclude:: ../../examples/snippets/await-completion-and-fetch.ts
    :language: typescript
    :dedent:


How to use the SDK to Offline sign a Transaction
------------------------------------------------

The SDK exposes functionality that can be used in an offline environment to sign and validate transactions the below script shows an entire
interaction between `Alice` and `Bob` with signing happening in an offline environment and online environment that performs the prepare and
submit.


.. literalinclude:: ../../examples/scripts/08-offline-signing-localnet.ts
    :language: typescript
    :dedent:



.. Link to this afterwards - https://docs.digitalasset.com/operate/3.3/howtos/troubleshoot/troubleshooting_guide.html#key-knowledge

.. TODO showcase exercise of the pong choice

.. TODO Observe the transaction until it is committed
