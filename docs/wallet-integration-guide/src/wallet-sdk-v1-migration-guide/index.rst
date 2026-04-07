Migration guide
=======================


Wallet SDK v1 is not backwards compatible with v0.

**Quick links**

- :ref:`wallet-sdk-config` - Detailed configuration guide
- :ref:`preparing-and-signing-transactions` - Preparing and signing transactions


We have removed the configure() and connect() pattern in favor of passing in a static configuration or a provider with ledger api capabilities.


.. code-block:: javascript

    const sdk = await SDK.create({
    auth: {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
        ledgerClientUrl: 'http://localhost:2975'
    })

    //These namespaces get initialized once a config is passed in

    const amulet = await sdk.amulet(amuletConfig)
    const token = await sdk.token(tokenConfig)
    const asset = await sdk.asset(assetConfig)

    //Provider pattern initialization

    const sdk = await SDK.create(provider)



Namespace changes
-------------------

We have removed the controllers and replaced them with namespaces to appropriately segregate the service layer in terms of business context.
When the sdk is initialized, it has access to the users, keys, ledger, and party namespaces.
The amulet, token, asset, and events namespace are initialized with a separate config. 

Removed functionality
------------------------

The following methods have been removed:

``sdk.connect()`` No longer needed, SDK is connected on creation 
``sdk.connectAdmin()`` No longer needed, admin operations are available in the ledger namespace and rights are extracted from the token.
``sdk.connectTopology()`` No longer needed, the grpc endpoints have been removed and replaced with ledger api endpoints.
``sdk.setPartyId()``  Pass `partyId` explicitly to each operation

In v0, the controllers and sdk were stateful. PartyId would be passed to all the controllers like the following:

.. code-block:: javascript

    sdk.setPartyId(myPartyId)
    const holdingTransactionsmyPartyId = await sdk.tokenStandard?.listHoldingTransactions()
    sdk.setPartyId(myPartyId2)
    const holdingTransactionsmyPartyId2 = await sdk.tokenStandard?.listHoldingTransactions()


In v1, party information should be passed explicitly to each function. This enables acting as multiple parties and allows for thread safety in concurrent use.

.. code-block:: javascript
  
    const holdingTransactionsmyPartyId = await token.holdings(myPartyId)
    const holdingTransactionsmyPartyId2 = await token.holdings(myPartyId2)


Migration reference table
----------------------------


.. list-table:: Migration reference table
   :widths: 25 25
   :header-rows: 1

   * - v0 controller + method
     - v1 namespace + method
   * - createKeyPair()
     - sdk.keys.generate()
   * - sdk.userLedger.signAndAllocateExternalParty(privateKey, partyHint)
     - sdk.party.external.create(publicKey, {partyHint}).sign(privateKey).execute()
   * - sdk.userLedger.listWallets()
     - sdk.party.list()
   * - sdk.userLedger.prepareSignExecuteAndWaitFor
     - sdk.ledger.prepare({partyId, commands, disclosedContracts}).sign(privateKey).execute(partyId)
   * - sdk.userLedger.activeContracts
     - sdk.ledger.acs.read
   * - sdk.adminLedger.uploadDar
     - sdk.ledger.dar.upload
   * - sdk.userLedger.isPackageUploaded
     - sdk.ledger.dar.check
   * - sdk.adminLedger.createUser
     - sdk.user.create
   * - sdk.userLedger.grantRights
     - sdk.user.rights.grant
   * - sdk.tokenStandard.createTransfer
     - token.transfer.create
   * - sdk.tokenStandard.exerciseTransferInstructionChoice
     - token.transfer.accept/token.transfer.reject/token.transfer.withdraw
   * - sdk.tokenStandard.fetchPendingTransferInstructionView
     - token.transfer.pending
   * - sdk.tokenStandard.listHoldingTransactions({partyId})
     - token.holdings
   * - sdk.tokenStandard.listHoldingUtxos()
     - token.utxos.list({partyId})
   * - sdk.tokenStandard.mergeHoldingUtxos
     - token.utxos.merge
   * - sdk.tokenStandard.fetchPendingAllocationRequestView
     - token.allocation.request.pending
   * - sdk.tokenStandard.fetchPendingAllocationInstructionView
     - token.allocation.instruction.pending
   * - sdk.tokenStandard.fetchPendingAllocationView
     - token.allocation.pending
   * - sdk.tokenStandard.getMemberTrafficStatus
     - amulet.traffic.status
   * - sdk.tokenStandard.buyMemberTraffic
     - amulet.traffic.buy
   * - sdk.userLedger.createTransferPreapprovalCommand
     - amulet.preapproval.command.create
   * - sdk.tokenStandard.getTransferPreApprovalByParty
     - amulet.preapproval.fetchStatus
   * - sdk.tokenStandard.createRenewTransferPreapproval
     - amulet.preapproval.renew
   * - sdk.tokenStandard.createCancelTransferPreapproval
     - amulet.preapproval.command.cancel
   * - sdk.tokenStandard.createTap
     - amulet.tap
   * - sdk.tokenStandard.lookupFeaturedApps
     - amulet.featuredApp.rights
   * - sdk.tokenStandard.selfGrantFeatureAppRights
     - amulet.featuredApp.grant
   * - sdk.tokenStandard.getInstrumentById
     - asset.find
   * - sdk.tokenStandard.listInstruments
     - asset.list
   * - sdk.userLedger.subscribeToUpdates
     - events.updates
   * - sdk.userLedger.subscribeToCompletions
     - events.completions
