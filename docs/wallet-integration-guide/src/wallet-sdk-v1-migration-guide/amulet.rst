.. _amulet-migration-v1:


Amulet
=======

The amulet namespace is used for Canton coin specific operations. 

Key changes from v0 to v1
-------------------------

v0 used the ``tokenStandard`` controller with implicit party context set via ``sdk.setPartyId()`` where the instrumentId and instrumentAdmin were passed in explicitly.

v1 uses the ``amulet`` namespace where you:

- Pass ``partyId`` explicitly to each operation
- Initialize the namespace with configuration, which determines the instrumentAdmin and instrumentId
- Access operations through logical groupings (``traffic`` and ``preapproval``)



**Creating preapprovals**

.. before-after::

   .. code-block:: javascript

      const transferPreApprovalProposal =
         await sdk.userLedger?.createTransferPreapprovalCommand(
            validatorOperatorParty!,
            receiver?.partyId!,
            instrumentAdminPartyId
         )

      await sdk.userLedger?.prepareSignExecuteAndWaitFor(
         [transferPreApprovalProposal],
         keyPairReceiver.privateKey,
         v4()
      )

   ---

   .. code-block:: javascript

      const createPreapprovalCommand = await amulet.preapproval.command.create({
         parties: {
            receiver: partyId,
         },
      })

      await sdk.ledger
            .prepare({
               partyId: partyId,
               commands: createPreapprovalCommand,
            })
            .sign(privateKey)
            .execute({
               partyId: partyId,
            })


The below example demonstrates the full process of renewing and cancelling preapprovals:

.. dropdown::

    .. literalinclude:: ../../examples/scripts/05-preapproval.ts
        :language: javascript
        :dedent:

**Buy Member Traffic**

.. before-after::

   .. code-block:: javascript

      const buyMemberTrafficCommand =
         await sdk.tokenStandard.buyMemberTraffic(
            senderPartyId,
            amount,
            participantId,
            inputUtxosOptional
         )

   ---

   .. code-block:: javascript

      const [buyTrafficCommand, buyTrafficDisclosedContracts] =
         await amulet.traffic.buy({
            buyer,
            ccAmount,
            inputUtxos: [],
         })


**Check Traffic Status**

.. before-after::

   .. code-block:: javascript

      await sdk.tokenStandard.getMemberTrafficStatus(participantId)

   ---

   .. code-block:: javascript

      await amulet.traffic.status()

Refer to the following example for more information:

.. dropdown::

    .. literalinclude:: ../../examples/scripts/07-buy-member-traffic.ts
        :language: javascript
        :dedent:     

**Tap**

The is useful for testing against LocalNet or Devnet.

.. before-after::

   .. code-block:: javascript

      await sdk.tokenStandard.createTap(partyId,
             amount,
             {
             instrumentId,
             instrumentAdmin
             })

   ---

   .. code-block:: javascript

      await amuet.tap(partyId, amount)



Migration reference
-------------------

..  list-table:: Party-related method migration
    :widths: 25 25
    :header-rows: 1

    * - v0 method
      - v1 method
   * - ``sdk.tokenStandard.getMemberTrafficStatus``
     - ``amulet.traffic.status``
   * - ``sdk.tokenStandard.buyMemberTraffic``
     - ``amulet.traffic.buy``
   * - ``sdk.userLedger.createTransferPreapprovalCommand``
     - ``amulet.preapproval.command.create``
   * - ``sdk.tokenStandard.getTransferPreApprovalByParty``
     - ``amulet.preapproval.fetchStatus``
   * - ``sdk.tokenStandard.createRenewTransferPreapproval``
     - ``amulet.preapproval.renew``
   * - ``sdk.tokenStandard.createCancelTransferPreapproval``
     - ``amulet.preapproval.command.cancel``
   * - ``sdk.tokenStandard.createTap``
     - ``amulet.tap``
   * - ``sdk.tokenStandard.lookupFeaturedApps``
     - ``amulet.featuredApp.rights``
   * - ``sdk.tokenStandard.selfGrantFeatureAppRights``
     - ``amulet.featuredApp.grant``

See also
--------

- :ref:`wallet-sdk-config` - SDK configuration
- :ref:`user management` - User management overview
