Preparing and Signing Transactions Using External Party
==========================================================

.. TODO figure out what trust assumptions should be aboue
.. trust assumptions
.. -----------------

How do i quickly execute a ping Command?
----------------------------------------

Here is how to quickly execute a ping command against yourself on Splice LocalNet:

.. literalinclude:: ../../examples/scripts/03-ping-localnet.ts
    :language: typescript
    :dedent:


Creating a Command
--------------------
Commands are the intends of an user on the validator, there are two kinds of commands: ``CreateCommand`` and ``ExerciseCommand``.

The ``CreateCommand`` is used to create a new implementation of a template with the given arguments and can result in one or more
new contracts being created. The ``ExerciseCommand`` takes an existing contract and exercises a choice on it, which also can
result in new contracts being created.

The AdminWorkflow inside the a validator allow us to create a simple ping command. The ping command is send to a recepient party
who can then exercise the pong choice on the created contract (thereby archiving it).

The Wallet SDK allow us to build such a command easily:

.. literalinclude:: ../../examples/snippets/create-ping-command.ts
    :language: typescript
    :dedent:

the underlying code that creates the command is:

.. code-block::

    createPingCommand(partyId: string) {
            return [
                {
                    CreateCommand: { // we are performing a CreateCommand
                        templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping', //template id of the ping contract
                        createArguments: { // the arguments to the ping contract
                            id: v4(), // an unique id for the ping
                            initiator: this.partyId, //our party id
                            responder: partyId, //the party we are pinging
                        },
                    },
                },
            ]
        }

preparing the Transaction
-------------------------
Now that we have a command we need to prepare the transaction against the ledger. A transaction is a collection of commands that are atomic, meaning that either all commands
succeed or none of them do. To prepare a transaction we need to send the commands to the ledger:

.. literalinclude:: ../../examples/snippets/prepare-ping-transaction.ts
    :language: typescript
    :dedent:

The return type is a transaction if the combination of the commands are possible, otherwise an error is returned.

Validating the Transaction
--------------------------
The transaction is returned alongside with the hash that needed to be signed. If the validator is not controlled by you, then it might
be a good idea to validate that the transaction is what you expect it to be. You can use the Wallet SDK to visualize the transaction (as described in the ../finding-and-reading-data/index.rst#visualizing-a-transaction section).
On top of visualizing the transaction confirming the hash matches before signing is also valuable.

The hash can be computed using the Wallet SDK:

.. literalinclude:: ../../examples/snippets/compute-transaction-hash.ts
    :language: typescript
    :dedent:

you can then compare the `hash` with the `transaction.preparedTransactionHash` to ensure they match.

Signing the Transaction
-----------------------
Once the transaction is validated it can be signed using the private key of the party.
The Wallet SDK has built in support for signing:

.. literalinclude:: ../../examples/snippets/sign-transaction-hash.ts
    :language: typescript
    :dedent:


Executing the Transaction
-------------------------
Once the transaction is signed it can be executed on the validator:

.. literalinclude:: ../../examples/snippets/execute-transaction.ts
    :language: typescript
    :dedent:

.. TODO showcase exercise of the pong choice

.. TODO Observe the transaction until it is committed
