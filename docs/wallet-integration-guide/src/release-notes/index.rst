Wallet SDK Release Notes
========================

Below are the release notes for the Wallet SDK versions, detailing new features, improvements, and bug fixes in each version.


0.16.0
------

**Released on November 4th, 2025**

* caching for amulet rules and open mining round

*Amulet rules are mostly static and open mining round persists for 10 min, so we can cache this response*

* observing participants for multi-hosting

.. code-block:: javascript

    /**
         * Generate topology transactions for an external party that can be signed and submitted in order to create a new external party.
         *
         * @param publicKey
         * @param partyHint (optional) hint to use for the partyId, if not provided the publicKey will be used.
         * @param confirmingThreshold (optional) parameter for multi-hosted parties (default is 1).
         * @param confirmingParticipantUids (optional) list of participant UIDs that will host the party with confirming permissions.
         * @param observingParticipantUids (optional) list of participant UIDs that will have Observation (read-only) permissions.
         * @returns
         */
        async generateExternalParty(
            publicKey: PublicKey,
            partyHint?: string,
            confirmingThreshold?: number,
            confirmingParticipantUids?: string[],
            //new field for observing participants
            observingParticipantUids?: string[]
        ): Promise<GenerateTransactionResponse> {

* decode topology transactions

.. code-block:: javascript

    generateExternalPartyResponse!.topologyTransactions!.map((topologyTx) => {

        const decodedTx = sdk.userLedger!.toDecodedTopologyTransaction(topologyTx)

        logger.info(decodedTx)
    })

0.15.0
------

**Released on October 29th, 2025**


.. important::

    Due to CommonJS compatibility, the module type needs to be explicitly declared in certain cases. If you see an error like
    `ERROR: Top-level await is currently not supported with the "cjs" output format` and are intended on using ESM then
    you should set `"type": "module"` in your package.json.

* Handling inflight transmissions

*Introduced special handling cases for `REQUEST_ALREADY_IN_FLIGHT` and `SUBMISSION_ALREADY_IN_FLIGHT`, now in those cases
the SDK will retrieve the inflight submission and track that for ..AndWait functions.*

* support cjs module

*The SDK now has a cjs release for consumption.*

* better handling of readAs and actAs rights

*Upgraded the handling in regards to readAs and actAs to be more fleshed out, especially also for the listWallets function.*

* ACS client side caching

*Querying the ACS is an expensive ledger API operation, as an alternative the ACS is fetched into memory once and subscribe to new
events instead. This should significantly reduce the load on the ledger especially in heavy read operations.*

* Caching of Access Tokens

*Previously a new token was retrieved from the AuthController every time a request was made, this is not a huge problem for `unsafe` tokens,
however still unnecessary. Tokens are now kept in memory and reused and a new token is only requested upon expiry.*

*For this change to take effect you need to alter your token usage to use `AccessTokenProvider` instead, all examples are updated accordingly.*


0.14.0
------

**Released on October 23th, 2025**

* Fixed broken dependency problem introduced in 0.13.X

0.13.1
------

**Released on October 22th, 2025**

.. important::

   Release 0.13.0 & 0.13.1 have broken dependencies, use 0.14.0 instead.

* Greatly reduced the size of the SDK from ~ 80 MB to ~ 35 MB
* introduced optional `limit` field for `listHoldingsUtxo`


0.13.0
------

**Released on October 22th, 2025**

.. important::

   Release 0.13.0 & 0.13.1 have broken dependencies, use 0.14.0 instead.


* **Important!: await completion has changed signature**


.. code-block:: javascript

        // old version
        async waitForCompletion(
            ledgerEnd: number | Types['GetLedgerEndResponse'],
            timeoutMs: number,
            commandId?: string,
            submissionId?: string
        ): Promise<Types['Completion']['value']> {

        // new version
        async waitForCompletion(
            ledgerEnd: number | Types['GetLedgerEndResponse'],
            timeoutMs: number,
            commandIdOrSubmissionId: string
        ): Promise<Types['Completion']['value']> {

*this change is to make it simpler, the method would regardless throw an error if commandId and SubmissionId was undefined*

* retry logic & stress testing

*we have substantially tested and verified the SDK working on moderate and heavy load mimicking MainNet, this highlighted some
retryable errors that could be handled.*

* multi hosted party fix and synchronized handling

*multi hosted parties have had a change under the hood, previously it would return the party asynchronously. This has been resolved
by calling the allocation on all the available ledger thereby ensuring the party is ready for use once it is returned by the method.*

* proxy delegation for feature app marker for deposits

*Proxy delegation support have been added for deposits allowing attaching a featured app marker flag to an incoming deposit, this requires
running the dar `splice-util-featured-app-proxies-1.1.0.dar` on the validator.*

.. code-block:: javascript

    const delegateCommand = await sdk.userLedger?.createDelegateProxyCommand(
        exchangeParty!,
        treasuryParty!.partyId
    )

    const delegationContractResult =
        await sdk.userLedger?.submitCommand(delegateCommand)

    const [acceptCommand, disclosedContracts4] =
        await sdk.tokenStandard?.exerciseTransferInstructionChoiceWithDelegate(
            transferCid, //incoming transfer
            'Accept',
            proxyCid!,
            featuredAppRights?.contract_id!,
            [
                {
                    beneficiary: exchangeParty!,
                    weight: 1.0,
                },
            ],
            featuredAppRights!
        )!

    //prepare, sign and execute the above command

* manual preapproval renewal and cancellation

*you an now use the SDK to manually renew a preapproval or cancel it*

.. code-block:: javascript

    //create renew command to be prepared, signed and executed
    const [renewCmd, disclosedContractsRenew] =
        await sdk.tokenStandard!.createRenewTransferPreapproval(
            preapproval.contractId,
            preapproval.templateId,
            validatorOperatorParty!
        )

    //create cancel command to be prepared, signed and executed
    const [cancelCmd, disclosedContractsCancel] =
        await sdk.tokenStandard!.createCancelTransferPreapproval(
            preapprovalAfterRenewal.contractId,
            preapprovalAfterRenewal.templateId,
            receiver!.partyId
        )

0.12.0
------

**Released on October 15th, 2025**

* **Important!: The custom meta-data on create transfer have changed format**

.. code-block:: javascript

    //previous format
    await sdk.tokenStandard!.createTransfer(
            sender!.partyId,
            receiver!.partyId,
            '100',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [],
            'memo-ref',
            new Date(Date.now() + 24 * 60 * 60 * 1000),
            {
                key1: "value1",
                key2: "value2"
            }
        )


    //new format
    await sdk.tokenStandard!.createTransfer(
            sender!.partyId,
            receiver!.partyId,
            '100',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [],
            'memo-ref',
            new Date(Date.now() + 24 * 60 * 60 * 1000),
                {
                values: {
                    key1: "value1",
                    key2: "value2"
                }
            }
        )

* Feature app marker delegation proxy

*The Wallet SDK is heavy focused on external party submission flows, however there are certain administrative tasks
that requires using the validator operator party (which is internally hosted). This is especially useful for setting up
delegation proxy contract needed for featured app markers.*

.. code-block:: javascript

    const delegateCommand = await sdk.userLedger?.createDelegateProxyCommand(
        exchangeParty,
        treasuryParty
    )

    const delegationContractResult =  await sdk.userLedger?.submitCommand(delegateCommand)

* Possibility to create commands offline

*certain commands like transfer required to be performed in an online context, this was needed to fetch relevant data
like transferInstruction choice context. This method (and allocation) have now been extended with optional parameters in
case that it is preferred to be pre-fetched.*

.. code-block:: javascript

    const choiceContext = await sdk.tokenStandard?.getCreateTransferContext(
        senderParty,
        receiverParty,
        amount,
        { instrumentId, instrumentAdmin},
        //normal optional parameters for a transfer here like memo and utxos
        )

     //OFFLINE

     const transferCommand = await sdk.tokenStandard?.createTransfer(
        senderParty,
        receiverParty,
        amount,
        { instrumentId, instrumentAdmin},
        prefetchedRegistryChoiceContext: choiceContext
     )



* Fetch contract by id

.. code-block:: javascript

    const holding = await sdk.tokenStandard?.listHoldingsUtxo(contractId)

* TLS enablement for grpc admin (topologyController)

*TLS configuration can now be provided for the topologyController allowing a safe and secure connection.*

.. code-block:: javascript

    const tlsTopologyController = (
        userId: string,
        userAdminToken: string
    ): TopologyController => {
        return new TopologyController(
            '127.0.0.1:5012',
            new URL('http://127.0.0.1:5003'),
            userId,
            userAdminToken,
            'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
            {
                useTls: true,
                tls: {
                    rootCert: path.join(here, PATH_TO_TLS_DIR, 'ca.crt'),
                    mutual: false,
                },
            }
        )
    }

* Stress tested party creation

*Party creation is under heavy load on mainnet and would consistently run into: `The server was not able to produce a timely response to your request`.
Safe guard has been added against this, when the error occurs we continuously look for the party to be available. If a timeout is
required then it will have to be handled outside of the method. It is worth nothing that the party creation has no timeout on ledger.*

you can disable this by setting `expectHeavyLoad` to false

.. code-block:: javascript

     /** Submits a prepared and signed external party topology to the ledger.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param signedHash The signed combined hash of the prepared transactions.
     * @param preparedParty The prepared party object from prepareExternalPartyTopology.
     * @param grantUserRights Defines if the transaction should also grant user right to current user (default is true)
     * @param expectHeavyLoad If true, the method will handle potential timeouts from the ledger api (default is true).
     * @returns An AllocatedParty object containing the partyId of the new party.
     */

    async allocateExternalParty(
        signedHash: string,
        preparedParty: GenerateTransactionResponse,
        grantUserRights: boolean = true,
        expectHeavyLoad: boolean = true
    )


0.11.0
------

**Released on October 10th, 2025**

* Added support to tap internal parties

*previously you could only tap external parties using signing flow, now it can be done for internal parties. this is useful
for tapping the validator operator party right after startup in case of missing funds.*

.. code-block:: javascript

    await sdk.tokenStandard?.createAndSubmitTapInternal(
        validatorOperatorParty!,
        '20000000',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        }
    )

* Dar-file manage

*the functionality have been added for the adminLedgerController to upload dars, this is useful for testing custom dar flows*

.. code-block:: javascript

    // check if a specific dar files exist
    const isDarUploaded = await sdk.userLedger?.isPackageUploaded(
        MY_DAR_PACKAGE
    )

    //upload a dar
    await sdk.adminLedger?.uploadDar(MY_DAR_BYTES)

* Full support for token standard allocations

.. code-block:: javascript

    // check pending allocation requests
    const pendingAllocationRequests = await sdk.tokenStandard?.fetchPendingAllocationRequestView()

    // create allocation command
    const specAlice = {
        settlement: allocationRequestViewAlice.settlement,
        transferLegId: legIdAlice,
        transferLeg: legAlice,
    }

    const [allocateCmdAlice, allocateDisclosedAlice] =
        await sdk.tokenStandard!.createAllocationInstruction(
            specAlice,
            legAlice.instrumentId.admin
        )

    // venue can check the allocation
    const allocationsVenue = await sdk.tokenStandard!.fetchPendingAllocationView()

* Party onboarding can now be done on the ledgerController instead of the TopologyController

*this removes the need for grpc admin access*

you can replace as such:

=================================================   ==============================================
Previous Method                                     new Method
=================================================   ==============================================
`sdk.topology?.prepareExternalPartyTopology`        `sdk.userLedger?.generateExternalParty`
`sdk.topology?.submitExternalPartyTopology`         `sdk.userLedger?.allocateExternalParty`
`sdk.topology?.prepareSignAndSubmitExternalParty`   `sdk.userLedger?.signAndAllocateExternalParty`
=================================================   ==============================================

the multi-hosted configuration is the same, except that **the ledger you call** should not be included in the array

.. code-block:: javascript

    //previous example of multi hosting
    const multiHostedParticipantEndpointConfig = [
        {
            adminApiUrl: '127.0.0.1:2902', //this is the ledger we actual call to allocate
            baseUrl: new URL('http://127.0.0.1:2975'),
            accessToken: adminToken.accessToken,
        },
        {
            adminApiUrl: '127.0.0.1:3902',
            baseUrl: new URL('http://127.0.0.1:3975'),
            accessToken: adminToken.accessToken,
        },
    ]

    //new example of multi hosting
    const multiHostedParticipantEndpointConfig = [
        {
            //admin url is not needed anymore
            url: new URL('http://127.0.0.1:3975'),
            accessToken: adminToken.accessToken,
        },
    ]

for backwards compatibility the previous endpoints are still there and available.

* User creation and rights management

*you can now create new users and manage rights through the Wallet SDK. This can be useful for setting up a master user*

.. code-block:: javascript

    //create new user for alice
    const aliceUser = await sdk.adminLedger!.createUser(
        'alice-user',
        aliceInternal
    )

    // grant alice CanReadAsAnyParty and CanExecuteAsAnyParty rights
    await sdk.adminLedger!.grantMasterUserRights(aliceUser.id, true, true)

* ListWallets now returns a list of partyIds instead of partyDetails
* ListWallets now correctly returns the parties that the user has access to (including CanReadAsAnyParty)
* Extended the max timeout when onboarding a party from 20s to 1 minute
* Party onboarding now queries the specific party instead of all parties (performance improvement)
* Party onboarding now has idempotent behavior
* Default values changed for Wallet SDK from `localLedgerDefault` to `localNetledgerDefault` on all controllers

.. code-block:: javascript

    //previous instantiation (still preferred)
    const sdk = new WalletSDKImpl().configure({
        logger: logger,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        topologyFactory: localNetTopologyDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    //new version (does the same)
    const sdk = new WalletSDKImpl().configure({
        logger: logger
    })

0.10.0
------

**Released on October 2nd, 2025**

* Self-issue feature app rights

*you can now grant yourself feature app rights (similar to the wallet UI) for both internal and external parties*

.. code-block:: javascript

    // For external parties
    const [command,disclosedContracts] = sdk.tokenStandard!.selfGrantFeatureAppRights()

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        command,
        keyPair.privateKey,
        v4(),
        disclosedContracts
    )

    // For internal parties
    await sdk.tokenStandard!.grantFeatureAppRightsForInternalParty()

* localNet variation for AppProvider & AppUser

*you can now use both the appProvider and AppUser easily for show operations between two validators*

.. code-block:: javascript

        const providerSDK = new WalletSDKImpl().configure({
            logger,
            authFactory: localNetAuthDefault,
            ledgerFactory: localNetLedgerAppProvider, //new variations here
            topologyFactory: localNetTopologyAppProvider, //new variations here
            tokenStandardFactory: localNetTokenStandardAppProvider, //new variations here
            validatorFactory: localValidatorDefault,
        })

        const userSDK = new WalletSDKImpl().configure({
            logger,
            authFactory: localNetAuthDefault,
            ledgerFactory: localNetLedgerAppUser, //new variations here
            topologyFactory: localNetTopologyAppUser, //new variations here
            tokenStandardFactory: localNetTokenStandardAppUser, //new variations here
            validatorFactory: localValidatorDefault,
        })

*LocalNet..Default still exists, they as previously defaults to the appUser validator*

* topology transaction recalculate hash

*you can now offline validate a topology transaction by recomputing the hash*

.. code-block:: javascript

    const recomputeHash = await TopologyController.computeTopologyTxHash(
        prepared!.partyTransactions
    )

    if (recomputeHash !== prepared!.combinedHash) {
        throw new Error(
            'Recomputed hash does not match prepared combined hash'
        )
    }

* new awaiting variation with `prepareSignExecuteAndWaitFor` & `executeSubmissionAndWaitFor`

*release 0.7.0 introduced the `waitForCompletion`, we have now backed that into the executions*

.. code-block:: javascript

    // PREVIOUS CODE EXAMPLE
    //it is recommended to fetch ledger offset before preparing your command
    const offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

    const transferCommandId =
        // prepareSignAndExecuteTransaction & prepareSign now returns the commandId
        await sdk.userLedger?.prepareSignAndExecuteTransaction(
            [{ ExerciseCommand: transferCommand }],
            keyPairSender.privateKey,
            v4(),
            disclosedContracts2
        )

    //new command that scans the ledger to ensure the command have completed
    const completion = await sdk.userLedger?.waitForCompletion(
        offsetLatest, //where to start from
        5000, //optional timeout in ms
        transferCommandId! //the command to look for
    )

    // NEW VARIATION
    const completion =
            await sdk.userLedger?.prepareSignExecuteAndWaitFor(
                transferCommand,
                keyPairSender.privateKey,
                v4(),
                disclosedContracts,
                10000 // 10 second timeout, if no value is provided here a default of 15 seconds is used
            )

    // VARIATION FOR `ExecuteSubmission`
    const completion =
            await onlineSDK.userLedger?.executeSubmissionAndWaitFor(
                transferCommand,
                signedHash,
                keyPairSender.publicKey,
                v4()
            )



* `executeSubmission` now returns the submissionId similarly to `prepareSignAndExecuteTransaction`
* fixed thrown exception for missing seed when using `TopologyController.createTransactionHash`
* `prepareSubmission` now has same command input signature as `prepareSignAndExecuteTransaction`

0.9.0
-----

**Released on September 26th, 2025**

* Supporting both canton 3.3 and 3.4 at the same timeout

*since canton 3.4 will soon come to splice being able to support both versions is imperative before*

* `localNetStaticConfig` added

*since the wallet api and registry are static for localnet, a new config has been added to make early development easier*

.. code-block:: javascript

    import {
        WalletSDKImpl,
        localNetAuthDefault,
        localNetLedgerDefault,
        localNetTopologyDefault,
        localNetTokenStandardDefault,
        localNetStaticConfig,
    } from '@canton-network/wallet-sdk'

    const sdk = new WalletSDKImpl().configure({
        logger,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        topologyFactory: localNetTopologyDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

    sdk.tokenStandard?.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

0.8.0
-----

**Release on September 24th, 2025**

* **Important!: The flow has been simplified for prepare and execute of commands, however this means code needs to be converted**

.. code-block:: javascript

    // previous prepare and submit flow
    const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
        sender!.partyId,
        '2000000',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        }
    )

    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: tapCommand }],
        keyPairSender.privateKey,
        v4(),
        disclosedContracts
    )

in the new flow it is no longer needed to perform the array wrapping `[{ ExerciseCommand: tapCommand }]`
and you can instead pass the `tapCommand` directly


.. code-block:: javascript

    // new prepare and submit flow
    const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
        sender!.partyId,
        '2000000',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        }
    )

    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        tapCommand,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts
    )

this goes for all transaction!

* Support Withdrawal flow for 2-step transfer

it is now possible for sender to withdraw a 2-step transfer that have previously been send

.. code-block:: javascript

    // Alice withdraws the transfer
    const [withdrawTransferCommand, disclosedContracts] =
        await sdk.tokenStandard!.exerciseTransferInstructionChoice(
            transferCid!,
            'Withdraw'
        )

note: this does not work if the receiver have already perform `Accept` or `Reject`

* Allow validating if receiver have set up transfer pre-approval before performing a transaction

.. code-block:: javascript

    //check if bob have set up transfer pre approval before sending
    const transferPreApprovalStatus =
            await sdk.tokenStandard?.getTransferPreApprovalByParty(
                receiver!.partyId,
                'Amulet'
            )
        logger.info(transferPreApprovalStatus, '[BOB] transfer preapproval status')

* Tested and verified against Splice 0.4.17
* Fix endless loop bug when onboarding a party


0.7.0
-----

**Release on September 18th, 2025**

* **Important!: scan api is not longer used for methods like `connectTopology` use scan proxy instead**
* Added support for multi-hosting a party upon creation against multiple validators

.. code-block:: javascript

    // setup config against multiple nodes to acquire signature
    const multiHostedParticipantEndpointConfig = [
        {
            adminApiUrl: '127.0.0.1:2902',
            baseUrl: new URL('http://127.0.0.1:2975'),
            accessToken: adminToken.accessToken,
        },
        {
            adminApiUrl: '127.0.0.1:3902',
            baseUrl: new URL('http://127.0.0.1:3975'),
            accessToken: adminToken.accessToken,
        },
    ]

    const participantIdPromises = multiHostedParticipantEndpointConfig.map(
        async (endpoint) => {
            return await sdk.topology?.getParticipantId(endpoint)
        }
    )
    const participantIds = await Promise.all(participantIdPromises)

    const participantPermissionMap = new Map<string, Enums_ParticipantPermission>()

    // decide on Permission for each participant
    participantIds.map((pId) =>
        participantPermissionMap.set(pId!, Enums_ParticipantPermission.CONFIRMATION)
    )

    // setup multi-hosting for a party against
    await sdk.topology?.prepareSignAndSubmitMultiHostExternalParty(
        multiHostedParticipantEndpointConfig,
        multiHostedParty.privateKey,
        synchronizerId,
        participantPermissionMap,
        'bob'
    )

* Verify signed transaction hash

we have also extended the `executeSubmission` and `prepareSignAndExecuteTransaction` to validate the hash before transmitting to the ledger

.. code-block:: javascript

    const hash = 'my-transaction-hash'
    const publicKey = 'my-public-key'
    const signature = 'my-signed-hash-with-private-key'
    const isValid = sdk.userLedger?.verifyTxHash(hash, publicKey, signature)

* wait for command completion

.. code-block:: javascript

    //it is recommended to fetch ledger offset before preparing your command
    const offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

    const transferCommandId =
        // prepareSignAndExecuteTransaction & prepareSign now returns the commandId
        await sdk.userLedger?.prepareSignAndExecuteTransaction(
            [{ ExerciseCommand: transferCommand }],
            keyPairSender.privateKey,
            v4(),
            disclosedContracts2
        )

    //new command that scans the ledger to ensure the command have completed
    const completion = await sdk.userLedger?.waitForCompletion(
        offsetLatest, //where to start from
        5000, //optional timeout in ms
        transferCommandId! //the command to look for
    )

* Added new endpoint to quickly fetch all pending 2-step incoming transfer to easily accept or reject

.. code-block:: javascript

    const pendingInstructions = await sdk.tokenStandard?.fetchPendingTransferInstructionView()

    const [acceptTransferCommand, disclosedContracts3] =
        await sdk.tokenStandard!.exerciseTransferInstructionChoice(
            transferCid,
            'Accept'
        )

* optional expiry date for create transfer

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
            utxos?.map((t) => t.contractId),
            'memo-ref',
            new Date(Date.now()+60*1000) // custom expiry of 1 hour
            // default is 24 hours
        )

* fetch transaction by update id

.. code-block:: javascript

    // convenient new endpoint to get transaction based on update id
    // this will come out in same format as listHoldingTransactions
    sdk.tokenStandard?.getTransactionById('my-update-id')

* The access token generated by the authController is now correctly passed to the scan proxy and registry



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



