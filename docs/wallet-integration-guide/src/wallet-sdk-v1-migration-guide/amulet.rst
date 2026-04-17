.. _amulet-migration-v1:


Amulet
=======

The amulet namespace is used for Canton coin specific operations.

Availability and extensibility
------------------------------

The amulet namespace is an extended namespace that requires configuration. You can initialize it either during SDK creation or later using the ``extend()`` method.

**Option 1: Initialize during SDK creation**

.. code-block:: javascript

   const sdk = await SDK.create({
       auth: authConfig,
       ledgerClientUrl: 'http://localhost:2975',
       amulet: {
           validatorUrl: 'http://localhost:2000/api/validator',
           scanApiUrl: 'http://localhost:2000/api/scan',
           auth: amuletAuthConfig,
           registryUrl: 'http://localhost:2000/api/registry'
       }
   })

   // amulet namespace is now available
   await sdk.amulet.traffic.status()

**Option 2: Add amulet namespace later using extend()**

.. code-block:: javascript

   // Create basic SDK first
   const basicSDK = await SDK.create({
       auth: authConfig,
       ledgerClientUrl: 'http://localhost:2975'
   })

   // Extend with amulet namespace when needed
   const extendedSDK = await basicSDK.extend({
       amulet: {
           validatorUrl: 'http://localhost:2000/api/validator',
           scanApiUrl: 'http://localhost:2000/api/scan',
           auth: amuletAuthConfig,
           registryUrl: 'http://localhost:2000/api/registry'
       }
   })

   // Now amulet namespace is available
   await extendedSDK.amulet.traffic.status()

Configuration
-------------

The ``AmuletConfig`` type defines the configuration for the amulet namespace:

.. code-block:: typescript

   type AmuletConfig = {
       auth: TokenProviderConfig
       validatorUrl: string | URL
       scanApiUrl: string | URL
       registryUrl: URL
   }

- ``auth``: Authentication configuration for accessing the validator and scan services
- ``validatorUrl``: URL of the validator service
- ``scanApiUrl``: URL of the scan API
- ``registryUrl``: URL of the amulet registry

Key changes from v0 to v1
-------------------------

v0 used the ``tokenStandard`` controller with implicit party context set via ``sdk.setPartyId()`` and the instrumentId and instrumentAdmin were passed in explicitly to each function.

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

      const createPreapprovalCommand = await sdk.amulet.preapproval.command.create({
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
         await sdk.amulet.traffic.buy({
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

      await sdk.amulet.traffic.status()

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

      await sdk.amuet.tap(partyId, amount)



Migration reference
-------------------

..  list-table:: Amulet namespace migration
    :widths: 25 25
    :header-rows: 1

    * - v0 method
      - v1 method
    * - ``sdk.tokenStandard.getMemberTrafficStatus``
      - ``sdk.amulet.traffic.status``
    * - ``sdk.tokenStandard.buyMemberTraffic``
      - ``sdk.amulet.traffic.buy``
    * - ``sdk.userLedger.createTransferPreapprovalCommand``
      - ``sdk.amulet.preapproval.command.create``
    * - ``sdk.tokenStandard.getTransferPreApprovalByParty``
      - ``sdk.amulet.preapproval.fetchStatus``
    * - ``sdk.tokenStandard.createRenewTransferPreapproval``
      - ``sdk.amulet.preapproval.renew``
    * - ``sdk.tokenStandard.createCancelTransferPreapproval``
      - ``sdk.amulet.preapproval.command.cancel``
    * - ``sdk.tokenStandard.createTap``
      - ``sdk.amulet.tap``
    * - ``sdk.tokenStandard.lookupFeaturedApps``
      - ``sdk.amulet.featuredApp.rights``
    * - ``sdk.tokenStandard.selfGrantFeatureAppRights``
      - ``sdk.amulet.featuredApp.grant``

See also
--------

- :ref:`wallet-sdk-config` - SDK configuration
- :ref:`user management` - User management overview
