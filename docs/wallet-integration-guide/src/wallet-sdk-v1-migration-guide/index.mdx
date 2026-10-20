Migration guide
=======================


Wallet SDK v1 is not backwards compatible with v0.

**Quick links**

- :ref:`wallet-sdk-config` - Detailed configuration guide
- :ref:`preparing-and-signing-transactions` - Preparing and signing transactions


We have removed the configure() and connect() pattern in favor of passing in a static configuration or a provider with ledger api capabilities.


Static configuration initialization where we supply an auth config and a ledgerClientUrl:

.. literalinclude:: ../../examples/snippets/config-template.ts
  :language: typescript
  :dedent:

Provider intialization:
The provider is an abstraction that ultimately interacts with the Ledger (JSON LAPI). This can be implemented for either a dApp consumer, direct ledger user, or alternative transport channels such as Wallet Connect.

.. code-block:: javascript

    // Notice that `auth` and `ledgerClientUrl` are no longer needed
    // when supplying sdk with custom provider
    const sdk = await SDK.create(config, provider)

Namespace changes
-------------------

We have removed the controllers and replaced them with namespaces to appropriately segregate the service layer in terms of business context.
When the sdk is initialized, it has access to the users, keys, ledger, and party namespaces.
The amulet, token, asset, and events namespace can initialized with a separate config via `.extend()` method.

.. toctree::
   :maxdepth: 2
   :caption: Detailed namespace guides:

   party
   token
   user
   amulet
   ledger
   asset


Removed functionality
------------------------

The following methods have been removed:

``sdk.connect()`` No longer needed, SDK is connected on creation
``sdk.connectAdmin()`` No longer needed, admin operations are available in the ledger namespace and rights are extracted from the token.
``sdk.connectTopology()`` No longer needed, the grpc endpoints have been removed and replaced with ledger api endpoints.
``sdk.setPartyId()``  Pass `partyId` explicitly to each operation

.. before-after::

   .. code-block:: javascript

      sdk.setPartyId(myPartyId)
      const holdingTransactionsmyPartyId = await sdk.tokenStandard?.listHoldingTransactions()
      sdk.setPartyId(myPartyId2)
      const holdingTransactionsmyPartyId2 = await sdk.tokenStandard?.listHoldingTransactions()

   ---

   .. code-block:: javascript

      const holdingTransactionsmyPartyId = await token.holdings(myPartyId)
      const holdingTransactionsmyPartyId2 = await token.holdings(myPartyId2)

In v0, the controllers and sdk were stateful. In v1, party information should be passed explicitly to each function. This enables acting as multiple parties and allows for thread safety in concurrent use.


Migration reference table
----------------------------


.. list-table:: Migration reference table
   :widths: 25 25
   :header-rows: 1

   * - v0 controller + method
     - v1 namespace + method
   * - ``createKeyPair()``
     - ``sdk.keys.generate()``
   * - ``sdk.userLedger.signAndAllocateExternalParty(privateKey, partyHint)``
     - ``sdk.party.external.create(publicKey, {partyHint}).sign(privateKey).execute()``
   * - ``sdk.userLedger.listWallets()``
     - ``sdk.party.list()``
   * - ``sdk.userLedger.prepareSignExecuteAndWaitFor``
     - ``sdk.ledger.prepare({partyId, commands, disclosedContracts}).sign(privateKey).execute(partyId)``
   * - ``sdk.userLedger.activeContracts``
     - ``sdk.ledger.acs.read``
   * - ``sdk.adminLedger.uploadDar``
     - ``sdk.ledger.dar.upload``
   * - ``sdk.userLedger.isPackageUploaded``
     - ``sdk.ledger.dar.check``
   * - ``sdk.adminLedger.createUser``
     - ``sdk.user.create``
   * - ``sdk.userLedger.grantRights``
     - ``sdk.user.rights.grant``
   * - ``sdk.tokenStandard.createTransfer``
     - ``sdk.token.transfer.create``
   * - ``sdk.tokenStandard.exerciseTransferInstructionChoice``
     - ``sdk.token.transfer.accept`` / ``sdk.token.transfer.reject`` / ``sdk.token.transfer.withdraw``
   * - ``sdk.tokenStandard.fetchPendingTransferInstructionView``
     - ``sdk.token.transfer.pending``
   * - ``sdk.tokenStandard.listHoldingTransactions({partyId})``
     - ``sdk.token.holdings``
   * - ``sdk.tokenStandard.listHoldingUtxos()``
     - ``sdk.token.utxos.list({partyId})``
   * - ``sdk.tokenStandard.mergeHoldingUtxos``
     - ``sdk.token.utxos.merge``
   * - ``sdk.tokenStandard.fetchPendingAllocationRequestView``
     - ``sdk.token.allocation.pending(partyId, ALLOCATION_REQUEST_INTERFACE_ID)``
   * - ``sdk.tokenStandard.fetchPendingAllocationInstructionView``
     - ``sdk.token.allocation.pending(partyId, ALLOCATION_INSTRUCTION_INTERFACE_ID)``
   * - ``sdk.tokenStandard.fetchPendingAllocationView``
     - ``sdk.token.allocation.pending(partyId)``
   * - ``sdk.tokenStandard.getAllocationExecuteTransferChoiceContext(cId)``
     - ``sdk.token.allocation.context.execute``
   * - ``sdk.tokenStandard.getAllocationWithdrawChoiceContext(cId)``
     - ``sdk.token.allocation.context.withdraw``
   * - ``sdk.tokenStandard.getAllocationCancelChoiceContext(cId)``
     - ``sdk.token.allocation.context.cancel``
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
   * - ``sdk.tokenStandard.getInstrumentById``
     - ``sdk.asset.find``
   * - ``sdk.tokenStandard.listInstruments``
     - ``sdk.asset.list``
   * - ``sdk.userLedger.subscribeToUpdates``
     - ``sdk.events.updates``
   * - ``sdk.userLedger.subscribeToCompletions``
     - ``sdk.events.completions``
