Wallet SDK Release Notes
========================

Below are the release notes for the Wallet SDK versions, detailing new features, improvements, and bug fixes in each version.

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



