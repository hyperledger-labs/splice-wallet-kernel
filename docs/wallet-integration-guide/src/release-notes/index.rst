Wallet SDK Release Notes
========================

Below are the release notes for the Wallet SDK versions, detailing new features, improvements, and bug fixes in each version.

0.6.1
-----

**Released on September 16th, 2025**

Fixed a minor edge case where a future mining round would be chosen if there was a client clock skew.

0.6.0
-----

**Released on September 16th, 2025**

* ledgerFactory, TopologyFactory & ValidatorFactory changed to use URL instead of strings (where applicable)

.. code-block:: javascript

    const myLedgerFactory = (userId: string, token: string) => {
        return new LedgerController(
            userId,
            new URL('http://my-json-ledger-api'), //HERE
            token
        )
    }

    const myTopologyFactory = (
        userId: string,
        userAdminToken: string,
        synchronizerId: string
    ) => {
        return new TopologyController(
            'my-grpc-admin-api',
            new URL('http://my-json-ledger-api'), //HERE
            userId,
            userAdminToken,
            synchronizerId
        )
    }

    const myValidatorFactory = (userId: string, token: string) => {
        return new ValidatorController(
            userId,
            new URL('http://my-validator-app-api'), //HERE
            token
        )
    }

* connectTopology now uses scanProxy instead of scan for proper decentralized setup
* stronger typing now required strings of specific formats for parties across all controllers
* fixed a bug where the combinedHash returned from topologyController.prepareExternalPartyTopology was in hex encoding instead of base64

.. code-block:: javascript

    const preparedParty = await sdk.topology?.prepareExternalPartyTopology(
        keyPair.publicKey
    )

    logger.info('Prepared external topology')

    if (preparedParty) {
        logger.info('Signing the hash')
        const signedHash = signTransactionHash(
        //previously this would have to be converted from hex to base64
            preparedParty?.combinedHash,
            keyPair.privateKey
        )

        const allocatedParty = await sdk.topology?.submitExternalPartyTopology(
            signedHash,
            preparedParty
        )

* fixed a bug that caused the expectedDso field to be required when performing TransferPreApprovalProposal (this is only required after Splice 0.1.11)
* simplified setParty & setSynchronizer, now it can all be done with one call on sdk.setPartyId()

.. code-block:: javascript

    //the connects are still needed and should be run before sdk.setPartyId
    await sdk.connect()
    await sdk.connectAdmin()
    await sdk.connectTopology(LOCALNET_SCAN_API_URL)

    //Previously all these was required to get everything working
    sdk.userLedger!.setPartyId(partyId)
    sdk.userLedger!.setSynchronizerId(synchronizerId)
    sdk.tokenStandard?.setPartyId(partyId)
    sdk.tokenStandard?.setSynchronizerId(synchronizerId)
    sdk.validator?.setPartyId(partyId)
    sdk.validator?.setSynchronizerId(synchronizerId)

    //New version
    await sdk.setPartyId(partyId,synchronizerId)
    //synchronizerId is optional, it will automatically select the first synchronizerId,
    //that the party is connected to if, none is defined

0.5.0
-----

**Released on September 11th, 2025**

* Memo field added to create transfer

.. code-block:: javascript

    const [transferCommand, disclosedContracts2] =
        await sdk.tokenStandard!.createTransfer(
            sender!.partyId,
            receiver!.partyId,
            '100',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            'my-new-favorite-memo-field'
        )

* pre-approval creation now supported through ledgerController instead of validatorController


previously

.. code-block:: javascript

    await sdk.validator?.externalPartyPreApprovalSetup(privateKey)

now instead using ledger api:

.. code-block:: javascript

    const transferPreApprovalProposal =
        sdk.userLedger?.createTransferPreapprovalCommand(
            validatorOperatorParty, //this needs to be sourced from the validator
            receiver?.partyId,
            instrumentAdminPartyId
        )

    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [transferPreApprovalProposal],
        keyPairReceiver.privateKey,
        v4()
    )


0.4.0
-----

**Released on September 10th, 2025**

* Range filter for `listHoldingTransactions(afterOffset?: string,beforeOffset?: string)`
* Transfer pre-approval support:

.. code-block:: javascript

    const sdk = new WalletSDKImpl().configure({
        logger,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        topologyFactory: localNetTopologyDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
        validatorFactory: localValidatorDefault, //Extend SDK with new validator factory
    })

    //set the party
    sdk.validator?.setPartyId(receiver?.partyId!)

    //provide private key to sign the pre-approval
    await sdk.validator?.externalPartyPreApprovalSetup(keyPairReceiver.privateKey)

* Support added for 2-step transfers (propose / accept)

.. code-block:: javascript

    const [acceptTransferCommand, disclosedContracts3] =
        await sdk.tokenStandard!.exerciseTransferInstructionChoice(
            transferCid, //cid of the transfer instruction
            'Accept' // or 'Reject'
        )

* ``listHoldingsUtxo`` has been extended to only ``nonLocked`` UTXOs

.. code-block:: javascript

    //new optional parameter, default is true (to be backwards compatible
    const usableUtxos = await sdk.tokenStandard?.listHoldingUtxos(false)

    //this include locked UTXOs
    const allUtxos = await sdk.tokenStandard?.listHoldingUtxos()

* Include some small bug fixes. The most noteable are:
    * ``Contract not found`` error when listing holdings (https://github.com/hyperledger-labs/splice-wallet-kernel/issues/357)
    * Requirements to have extra import (like @protobuf-ts/runtime-rpc) resolved



