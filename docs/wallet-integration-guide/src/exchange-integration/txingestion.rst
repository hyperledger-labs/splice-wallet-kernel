.. _transaction-ingestion:

Transaction History Ingestion Details
=====================================

Transaction Parsing
^^^^^^^^^^^^^^^^^^^

As part of the :ref:`integration-workflows`, Tx History Ingestion is
expected to extract a number of fields for both deposits and
withdrawals. The easiest way of handling this is using the `token
standard history parser
<https://github.com/hyperledger-labs/splice-wallet-kernel/blob/main/core/ledger-client/src/txparse/parser.ts>`_. However,
in some cases you might not be able to use that and need to write your
own parser. This section provides information on the transaction
structure and parsing strategy.

1-Step Transfers
~~~~~~~~~~~~~~~~

To understand the structure of a 1-step deposit, let's look at an example transaction
 as seen through the `JSON Ledger API <https://docs.digitalasset.com/build/3.3/tutorials/json-api/canton_and_the_json_ledger_api.html>`_.

In this case, we query a single transaction. The format is identical to the transaction you will get when streaming transactions through ``/v2/updates/flats`` and you can also use the same filter.
Note that you need to adjust the ``auth-token``, ``update-id`` and ``treasury-party`` placeholders to match your setup.

.. code:: bash

    curl -sSL --fail-with-body http://json-api-url/v2/updates/update-by-id \
        -H 'Authorization: Bearer <authtoken>' \
          -d '{
                "updateId": "<update-id>",
                "updateFormat": {
                  "includeTransactions": {
                    "transactionShape": "TRANSACTION_SHAPE_LEDGER_EFFECTS",
                    "eventFormat": {
                      "filtersByParty": {
                        "<treasury-party>": {
                          "cumulative": [
                            {"identifierFilter": {"WildcardFilter": {"value": {"includeCreatedEventBlob": false}}}},
                            {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}},
                            {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}},
                            {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}}
                          ]
                        }
                      },
                      "verbose": true
                    }
                  }
                }
              }'

.. literalinclude:: 1-step-transfer.json
    :language: json

You can parse such transactions using the `token standard history parser <https://github.com/hyperledger-labs/splice-wallet-kernel/blob/main/core/ledger-client/src/txparse/parser.ts>`_ provided in the wallet SDK to extract the deposit amount, account and holding contract ids. Note that one-step deposits are more complex to parse than two-step transfers as the token standard does not provide an interface choice visible to the receiver. If you prefer implementing your own implementation, you can parse this as follows:

1. Go over the list of events ordered by ``nodeId`` that you see in the transaction.
2. For each exercised event, check the exercise result. If it has a
   field called ```meta`` with a
   ``"splice.lfdecentralizedtrust.org/tx-kind": "transfer"`` field you
   found a transfer.  In the example here, this is the event with
   ``nodeId`` 4 which exercises the ``TransferPreapproval_Send``
   choice. Note that this choice is specific to Canton Coin so rely on
   the existence of the ``meta`` field which is standardized instead
   of the specific choice name.
3. Extract the ``"splice.lfdecentralizedtrust.org/reason"`` to get the deposit account. In this example it is ``deposit-account-id``.
4. Go over all events whose ``nodeId`` is larger than the ``nodeId`` of the transfer (4 in the example here) and smaller than the ``lastDescendantNodeId`` of the transfer (12 in the example here).
5. Find all ``CreatedEvents`` in that range that create a ``Holding`` with
   ``"owner": "<treasury-party>"`` and sum up the amounts for each
   ``instrumentId``.  In this example, we have two events that create
   holdings, ``nodeId`` 11 and 12. However, only 12 has ``"owner":
   "<treasury-party>"``. Therefore, we extract that the transfer created
   ``200.0000000000`` for the token with instrument id ``{"admin":
   "DSO::12204b8b621ec1dedd51ee2510085f8164cad194953496494d32f541f3f2c170e962",
   "id": "Amulet"}``.
6. Find all ``ExercisedEvents`` with ``implementedInterfaces``
   containing the ``Holding`` interface and ``consuming: true``. In
   the example here, this is the event with ``nodeId:: 8``. For each of them get the ``contractId`` and lookup the contract payload through the event query service as shown below.
   If you get a 404, it's a holding for a different party so you can ignore it. If you get back an event, check if ``"owner": "<treasury-party>"``. If so, sum up all events for which this is the case.
   In the example here, we get a 404 as it is a holding of the sender not treasury-party.

   .. code:: bash

       curl -sSL --fail-with-body http://json-api-url/v2/events/events-by-contract-id \
         -H 'Authorization: Bearer 721580fa5edea5c12b887af1dba4ed2381c507d1a94c96aa63685198c958bf3ddd951d3cb004ead720c61734d4035c442afc102896cdb75e1c0883f61828eaed' \
           -d '{
             "contractId": "009b939ae451ef1a0cb81d1606391406690e055b5be301fd2f51efb6be5675577eca1112200f58604ac538224f73bdc57117d73830ed1e3167f956d66f9e3ecdacbf2359a7",
             "eventFormat": {
               "filtersByParty": {
                 "<treasury-party>": {
                   "cumulative": [
                     {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}}
                   ]
                 }
               },
               "verbose": true
             }
           }'

7. Subtract the sum of archived holdings for the treasury-party from the sum
   of created holdings. This gives you the deposit amount for each
   instrument id. You now extracted the deposit amount from the
   created and exercised events, the UTXOs from the created events and
   the deposit acount from the
   ``splice.lfdecentralizedtrust.org/reason`` field.
8. Continue with the events starting at node id
   ``lastDescendantNodeId + 1``. Note that in this example this skips
   over the event with ``nodeId: 5`` which exercises
   ``AmuletRules_Transfer``. This is important as you already
   accounted for this event through the parent event at node id 4. Note that one transaction can contain multiple deposits including mixing 1 and 2-step deposits in the same transaction.


Multi-Step Transfers
~~~~~~~~~~~~~~~~~~~~

To understand the transaction structure of a multi-step transfer, let's look at an example transaction
of a Multi-Step Deposit as seen through the `JSON Ledger API <https://docs.digitalasset.com/build/3.3/tutorials/json-api/canton_and_the_json_ledger_api.html>`_.

In this case, we query a single transaction. The format is identical to the transaction you will get when streaming transactions through ``/v2/updates/flats`` and you can also use the same filter.
Note that you need to adjust the ``auth-token``, ``update-id`` and ``treasury-party`` placeholders to match your setup.

.. code:: bash

    curl -sSL --fail-with-body http://json-api-url/v2/updates/update-by-id \
        -H 'Authorization: Bearer <authtoken>' \
          -d '{
                "updateId": "<update-id>",
                "updateFormat": {
                  "includeTransactions": {
                    "transactionShape": "TRANSACTION_SHAPE_LEDGER_EFFECTS",
                    "eventFormat": {
                      "filtersByParty": {
                        "<treasury-party>": {
                          "cumulative": [
                            {"identifierFilter": {"WildcardFilter": {"value": {"includeCreatedEventBlob": false}}}},
                            {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}},
                            {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-holding-v1:Splice.Api.Token.HoldingV1:Holding", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}},
                            {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}}
                          ]
                        }
                      },
                      "verbose": true
                    }
                  }
                }
              }'

.. literalinclude:: transfer-instruction-create.json
    :language: json

You can parse such transactions using the `token standard history parser <https://github.com/hyperledger-labs/splice-wallet-kernel/blob/main/core/ledger-client/src/txparse/parser.ts>`_ provided in the wallet SDK to extract the deposit amount, account and holding contract ids. If you prefer implementing your own implementation, you can parse this as follows:

1. Go over the list of events ordered by ``nodeId`` that you see in the transaction.
2. Look for all ``CreatedEvents`` of the ``TransferInstruction`` interface with ``"receiver": "<treasury-party>"``. Each of these represents a deposit offer that can be accepted or rejected.
   In the example this is only one event with node id ``0``. Extract the ``instrument``, the ``amount`` and the ``splice.lfdecentralizedtrust.org/reason`` field from the ``interfaceView`` and the contract id of the ``TransferInstruction``. Note that one transaction can contain multiple deposits including mixing 1 and 2-step deposits in the same transaction.

After accepting the deposit offer through your automation, Tx History Ingestion can then observe and process acceptance. An example of such a transaction can be seen below.

.. literalinclude:: transfer-instruction-accept.json
    :language: json

To parse this proceed as follows:

1. Go over the list of events ordered by ``nodeId`` that you see in the transaction.
2. Look for exercises of the ``TransferInstruction_Accept`` choice on the ``TransferInstruction`` interface. In the example, this is the event with node id ``0``. For each of those, extract the contract id. You can then query the event query service using:

   .. code:: bash

     curl -sSL --fail-with-body http://json-api-url/v2/events/events-by-contract-id \
       -H 'Authorization: Bearer 00fc774936c91f423c117744102a5996e4dc117f2b6496ef337967a7d2c5d02e4aca1112203c35266c980ae19508cc690cb501f8c767c02bfdbe838f1f89105de6fe59439f' \
         -d '{
           "contractId": "009b939ae451ef1a0cb81d1606391406690e055b5be301fd2f51efb6be5675577eca1112200f58604ac538224f73bdc57117d73830ed1e3167f956d66f9e3ecdacbf2359a7",
           "eventFormat": {
             "filtersByParty": {
               "<treasury-party>": {
                 "cumulative": [
                   {"identifierFilter": {"InterfaceFilter": {"value": {"interfaceId": "#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction", "includeInterfaceView": true, "includeCreatedEventBlob": false}}}}
                 ]
               }
             },
             "verbose": true
           }
         }'

   If you get a 404, the instruction is not for your treasury party so you can ignore it. If you get back an event, it has the same structure that we've seen above when a transfer offer is created and you can again extract the amount, instrument id and deposit account from it.
