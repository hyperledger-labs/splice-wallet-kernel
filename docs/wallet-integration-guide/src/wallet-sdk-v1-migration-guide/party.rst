.. Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
.. SPDX-License-Identifier: Apache-2.0

.. _parties-migration-v1:

Parties
=======

The party namespace provides methods to manage wallet parties on the Canton Network. In v1, the party namespace replaces the stateful party management from v0.

Key changes from v0 to v1
-------------------------

v0 used a stateful approach where you set a party context once with ``sdk.setPartyId()``. All subsequent operations acted on that party.

v1 uses an explicit approach where you pass the party ID to each operation. This enables:

- Thread-safe concurrent operations
- Multi-party transactions within the same application
- Clearer code intent

.. before-after::

   .. code-block:: javascript

      sdk.setPartyId(myPartyId)
      const result = await sdk.userLedger.doSomething()

   ---

   .. code-block:: javascript

      const result = await sdk.ledger
          .prepare({ partyId: myPartyId, ... })
          .sign(privateKey)
          .execute({ partyId: myPartyId })

Refer to :ref:`preparing-and-signing-transactions` for more information.

Party types
-----------

**Internal parties**

.. before-after::

   .. code-block:: javascript

      const internalParty =
      await sdk.adminLedger!.allocateInternalParty(partyHint)

   ---

   .. code-block:: javascript

      // v1 - no state, explicit party ID
      const internalParty = await sdk.party.internal.allocate({
          partyHint: 'my-service',
          synchronizerId: 'my-synchronizer-id'
      })

The below example demonstrates the full usage of the feature:

.. dropdown::

    .. literalinclude:: ../../examples/scripts/09-multi-user-setup.ts
        :language: javascript
        :dedent:

**External parties**

An external party uses an external key pair for signing. You provide the public key, and the SDK generates the topology. You then sign the topology transaction with your private key and execute it on the ledger.

.. before-after::

    .. code-block:: javascript

        const party = await sdk.userLedger?.signAndAllocateExternalParty(
                privateKey,
                partyHint
            )

    ---

    .. code-block:: javascript

        const party = await sdk.party.external
            .create(publicKey, { partyHint: 'my-party' })
            .sign(privateKey)
            .execute()

.. note::

    We recommend always providing a ``partyHint`` when creating a party. Refer to :ref:`party-hint` for more details.

Listing parties
---------------

.. before-after::

   .. code-block:: javascript

      const wallets = await sdk.userLedger?.listWallets()

   ---

   .. code-block:: javascript

      const partyIds = await sdk.party.list()

This method returns all parties where the user has ``CanActAs``, ``CanReadAs``, or ``CanExecuteAs`` rights. If the user has admin rights, all local parties are returned.

Offline signing workflow
------------------------

.. before-after::

   .. code-block:: javascript

      const preparedParty = await sdk.userLedger?.generateExternalParty(
          keyPair.publicKey, partyHint
      )
      const allocatedParty = await sdk.userLedger?.allocateExternalParty(
          signature,
          preparedParty
      )

   ---

   .. code-block:: javascript

      const party = await sdk.party.external
          .create(publicKey, options)
          .execute(signature, executeOptions)

Migration reference
-------------------

..  list-table:: Party-related method migration
    :widths: 25 25
    :header-rows: 1

    * - v0 method
      - v1 method
    * - ``sdk.setPartyId(partyId)``
      - Pass ``partyId`` explicitly to each operation
    * - ``sdk.userLedger.listWallets()``
      - ``sdk.party.list()``
    * - ``sdk.userLedger.signAndAllocateExternalParty(privateKey, partyHint)``
      - ``sdk.party.external.create(publicKey, {partyHint}).sign(privateKey).execute()``
    * - ``sdk.topology?.prepareExternalPartyTopology()``
      - ``sdk.party.external.create().prepare()`` (implicit on create)
    * - ``sdk.topology?.submitExternalPartyTopology()``
      - ``sdk.party.external.create().sign().execute()``

See also
--------

- :ref:`wallet-sdk-config` - SDK configuration
- :ref:`preparing-and-signing-transactions` - Transaction lifecycle
