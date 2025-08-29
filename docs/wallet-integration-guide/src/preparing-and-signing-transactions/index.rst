Preparing and Signing Transactions Using External Party
==========================================================

.. TODO figure out what trust assumptions should be aboue
.. trust assumptions
.. -----------------

How do I quickly execute a ping Command?
----------------------------------------

The following example uses the Ping app which comes pre-installed with the validator and shows the whole transaction flow.

Below shows how to quickly execute a ping command against yourself on Splice LocalNet:

.. literalinclude:: ../../examples/scripts/03-ping-localnet.ts
    :language: typescript
    :dedent:


Creating a Command
--------------------
Commands are the intents of an user on the validator, there are two kinds of commands: ``CreateCommand`` and ``ExerciseCommand``.

The ``CreateCommand`` is used to create a new implementation of a template with the given arguments and can result in one or more
new contracts being created. The ``ExerciseCommand`` takes an existing contract and exercises a choice on it, which also can
result in new contracts being created.

The AdminWorkflow inside the a validator allows us to create a simple ping command. The ping command is sent to a recepient party
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
                            id: v4(), // an unique id for the ping. Here we use the JS uuid library to generate a v4 UUID
                            initiator: this.partyId, //our party id
                            responder: partyId, //the party we are pinging
                        },
                    },
                },
            ]
        }

Preparing the Transaction
-------------------------
Now that we have a command we need to prepare the transaction against the ledger which will return an unsigned transaction. A transaction is a collection of commands that are atomic, meaning that either all commands
succeed or none of them do. To prepare a transaction we need to send the commands to the ledger:

.. literalinclude:: ../../examples/snippets/prepare-ping-transaction.ts
    :language: typescript
    :dedent:

The return type is an unsigned transaction if the combination of the commands are possible, otherwise an error is returned. The transaction can then be visualised and signed by the party.

Validating the Transaction
--------------------------
The transaction is returned alongside with the hash that needs to be signed. If the validator is not controlled by you, then it might
be a good idea to validate that the transaction is what you expect it to be. You can use the Wallet SDK to visualize the transaction 
as described in the :ref:`Visualizing a transaction section <visualizing-a-transaction>`.

On top of visualizing the transaction, it's also important to compute the transaction hash yourself and confirm that it matches the hash of the transaction provided by the validator from the prepare step.

The hash can be computed using the Wallet SDK:

.. literalinclude:: ../../examples/snippets/compute-transaction-hash.ts
    :language: typescript
    :dedent:

You can then compare the `hash` with the `transaction.preparedTransactionHash` to ensure they match.

Signing the Transaction
-----------------------
Once the transaction is validated it can be signed using the private key of the party.
The Wallet SDK has built in support for signing:

.. literalinclude:: ../../examples/snippets/sign-transaction-hash.ts
    :language: typescript
    :dedent:


Executing the Transaction
-------------------------
Once the transaction is signed, it can be executed on the validator:

.. literalinclude:: ../../examples/snippets/execute-transaction.ts
    :language: typescript
    :dedent:

.. TODO showcase exercise of the pong choice

.. TODO Observe the transaction until it is committed
