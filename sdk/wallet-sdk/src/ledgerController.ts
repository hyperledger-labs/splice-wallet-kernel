// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    LedgerClient,
    PostResponse,
    PostRequest,
    GetResponse,
    Types,
    awaitCompletion,
    promiseWithTimeout,
    GenerateTransactionResponse,
    AllocateExternalPartyResponse,
    isJsCantonError,
    components,
} from '@canton-network/core-ledger-client'
import {
    signTransactionHash,
    getPublicKeyFromPrivate,
    PrivateKey,
    PublicKey,
    verifySignedTxHash,
} from '@canton-network/core-signing-lib'
import { v4 } from 'uuid'
import { pino } from 'pino'
import { SigningPublicKey } from '@canton-network/core-ledger-proto'
import { TopologyController } from './topologyController.js'
import { PartyId } from '@canton-network/core-types'
import { retryable } from '@canton-network/core-ledger-client/dist/ledger-api-utils.js'

export type RawCommandMap = {
    ExerciseCommand: Types['ExerciseCommand']
    CreateCommand: Types['CreateCommand']
    CreateAndExerciseCommand: Types['CreateAndExerciseCommand']
}
export type WrappedCommand<
    K extends keyof RawCommandMap = keyof RawCommandMap,
> = {
    [P in K]: { [Q in P]: RawCommandMap[P] }
}[K]
/**
 * Controller for interacting with the Ledger API, this is the primary interaction point with the validator node
 * using external signing.
 */
export class LedgerController {
    private readonly client: LedgerClient
    private readonly userId: string
    private readonly isAdmin: boolean
    private partyId: PartyId | undefined
    private synchronizerId: PartyId | undefined
    private logger = pino({ name: 'LedgerController', level: 'info' })

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param token the access token from the user, usually provided by an auth controller.
     * @param isAdmin optional flag to set true when creating adminLedger.
     */
    constructor(userId: string, baseUrl: URL, token: string, isAdmin: boolean) {
        this.client = new LedgerClient(baseUrl, token, this.logger)
        this.client.init()
        this.userId = userId
        this.isAdmin = isAdmin
        return this
    }

    /**
     * Sets the party that the ledgerController will use for requests.
     * @param partyId
     */
    setPartyId(partyId: PartyId): LedgerController {
        this.partyId = partyId
        return this
    }

    /**
     *  Gets the party Id or throws an error if it has not been set yet
     *  @returns partyId
     */
    getPartyId(): PartyId {
        if (!this.partyId)
            throw new Error('PartyId is not defined, call setPartyId')
        else return this.partyId
    }

    /**
     *  Gets the synchronizer Id or throws an error if it has not been set yet
     *  @returns partyId
     */
    getSynchronizerId(): PartyId {
        if (!this.synchronizerId)
            throw new Error(
                'synchronizer Id is not defined, call setSynchronizerId'
            )
        else return this.synchronizerId
    }

    /**
     * Sets the synchronizerId that the ledgerController will use for requests.
     * @param synchronizerId
     */
    setSynchronizerId(synchronizerId: PartyId): LedgerController {
        this.synchronizerId = synchronizerId
        return this
    }

    /**
     * Verifies the signature for a message
     * @param txHash hash of the prepared transaction
     * @param publicKey the public key correlating to the private key used to sign the signature.
     * @param signature the signed signature of the preparedTransactionHash from the prepareSubmission method.
     * @returns true if verification succeeded or false if it failed
     */
    verifyTxHash(
        txHash: string,
        publicKey: PublicKey,
        signature: string
    ): boolean
    /** @deprecated protobuf version of public key is unsupported, use the `PublicKey` type instead */
    verifyTxHash(
        txHash: string,
        publicKey: SigningPublicKey,
        signature: string
    ): boolean
    /** @deprecated protobuf version of public key is unsupported, use the `PublicKey` type instead */
    verifyTxHash(
        txHash: string,
        publicKey: SigningPublicKey | PublicKey,
        signature: string
    ): boolean
    verifyTxHash(
        txHash: string,
        publicKey: SigningPublicKey | PublicKey,
        signature: string
    ): boolean {
        let key: string
        if (typeof publicKey === 'string') {
            key = publicKey
        } else {
            key = btoa(String.fromCodePoint(...publicKey.publicKey))
        }

        try {
            return verifySignedTxHash(txHash, key, signature)
        } catch (e: unknown) {
            this.logger.error(e)
            return false
        }
    }
    /**
     * Prepares, signs and executes a transaction on the ledger (using interactive submission).
     * @param commands the commands to be executed.
     * @param privateKey the private key to sign the transaction with.
     * @param commandId an unique identifier used to track the transaction, if not provided a random UUID will be used.
     * @param disclosedContracts off-ledger sourced contractIds needed to perform the transaction.
     * @returns the submissionId used to track the transaction.
     */
    async prepareSignAndExecuteTransaction(
        commands: WrappedCommand | WrappedCommand[] | unknown,
        privateKey: PrivateKey,
        commandId: string,
        disclosedContracts?: Types['DisclosedContract'][]
    ): Promise<string> {
        const prepared = await this.prepareSubmission(
            commands,
            commandId,
            disclosedContracts
        )

        const calculatedTxHash = await TopologyController.createTransactionHash(
            prepared.preparedTransaction!
        )

        if (calculatedTxHash !== prepared.preparedTransactionHash) {
            this.logger.error(
                `Calculated tx hash ${calculatedTxHash}, got ${prepared.preparedTransactionHash} from ledger api`
            )
        }
        const signature = signTransactionHash(
            prepared.preparedTransactionHash,
            privateKey
        )
        const publicKey = getPublicKeyFromPrivate(privateKey)

        return this.executeSubmission(prepared, signature, publicKey, commandId)
    }

    /**
     * Prepares, signs and executes a transaction on the ledger (using interactive submission).
     * @param commands the commands to be executed.
     * @param privateKey the private key to sign the transaction with.
     * @param commandId an unique identifier used to track the transaction, if not provided a random UUID will be used.
     * @param disclosedContracts off-ledger sourced contractIds needed to perform the transaction.
     * @param timeoutMs The maximum time to wait in milliseconds.
     * @returns the commandId used to track the transaction.
     */
    async prepareSignExecuteAndWaitFor(
        commands: WrappedCommand | WrappedCommand[] | unknown,
        privateKey: PrivateKey,
        commandId: string,
        disclosedContracts?: Types['DisclosedContract'][],
        timeoutMs: number = 15000
    ): Promise<Types['Completion']['value']> {
        const ledgerEnd = await this.ledgerEnd()
        await this.prepareSignAndExecuteTransaction(
            commands,
            privateKey,
            commandId,
            disclosedContracts
        )
        return this.waitForCompletion(ledgerEnd, timeoutMs, commandId)
    }

    /**
     * Waits for a command to be completed by polling the completions endpoint.
     * @param ledgerEnd The offset to start polling from.
     * @param timeoutMs The maximum time to wait in milliseconds.
     * @param commandId Optional command id to wait for.
     * @param submissionId Optional submission id to wait for.
     * @returns The completion value of the command.
     * @throws An error if the timeout is reached before the command is completed.
     */
    async waitForCompletion(
        ledgerEnd: number | Types['GetLedgerEndResponse'],
        timeoutMs: number,
        commandId?: string,
        submissionId?: string
    ): Promise<Types['Completion']['value']> {
        const ledgerEndNumber: number =
            typeof ledgerEnd === 'number' ? ledgerEnd : ledgerEnd.offset
        const completionPromise = awaitCompletion(
            this.client,
            ledgerEndNumber,
            this.getPartyId(),
            this.userId,
            commandId,
            submissionId
        )
        return promiseWithTimeout(
            completionPromise,
            timeoutMs,
            `Timed out getting completion for submission with userId=${this.userId}, commandId=${commandId}, submissionId=${submissionId}.
    The submission might have succeeded or failed, but it couldn't be determined in time.`
        )
    }

    /**
     * Allocates a new internal party on the ledger, if no partyHint is provided a random UUID will be used.
     * Internal parties uses the canton keys for signing and does not use the interactive submission flow.
     * @param partyHint partyHint to be used for the new party.
     */
    async allocateInternalParty(partyHint?: string): Promise<PartyId> {
        if (partyHint && partyHint !== undefined) {
            const internalParty = await this.client.get('/v2/parties', {
                path: { partyHint: partyHint },
                query: {},
            })
            if (
                internalParty.partyDetails &&
                internalParty.partyDetails.length > 0
            ) {
                return internalParty.partyDetails[0].party
            }
        }

        return (
            await this.client.post('/v2/parties', {
                partyIdHint: partyHint || v4(),
                identityProviderId: '',
            })
        ).partyDetails!.party
    }

    /**
     * Generate topology transactions for an external party that can be signed and submitted in order to create a new external party.
     *
     * @param publicKey
     * @param partyHint (optional) hint to use for the partyId, if not provided the publicKey will be used.
     * @param confirmingThreshold (optional) parameter for multi-hosted parties (default is 1).
     * @param hostingParticipantUids (optional) list of participant UIDs that will host the party.
     * @returns
     */
    async generateExternalParty(
        publicKey: PublicKey,
        partyHint?: string,
        confirmingThreshold?: number,
        hostingParticipantUids?: string[]
    ): Promise<GenerateTransactionResponse> {
        return this.client.generateTopology(
            this.getSynchronizerId(),
            publicKey,
            partyHint || v4(),
            false,
            confirmingThreshold,
            hostingParticipantUids
        )
    }

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
    ): Promise<AllocateExternalPartyResponse> {
        if (await this.client.checkIfPartyExists(preparedParty.partyId))
            return { partyId: preparedParty.partyId }

        const { publicKeyFingerprint, partyId, topologyTransactions } =
            preparedParty

        try {
            await this.client.allocateExternalParty(
                this.getSynchronizerId(),
                topologyTransactions!.map((transaction) => ({ transaction })),
                [
                    {
                        format: 'SIGNATURE_FORMAT_CONCAT',
                        signature: signedHash,
                        signedBy: publicKeyFingerprint,
                        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                    },
                ]
            )
        } catch (e) {
            const errorMsg =
                typeof e === 'string' ? e : e instanceof Error ? e.message : ''
            if (
                expectHeavyLoad &&
                errorMsg.includes(
                    'The server was not able to produce a timely response to your request'
                )
            ) {
                this.logger.warn(
                    'Received timeout from ledger api when allocating party, however expecting heavy load is set to true'
                )
                // this is a timeout and we just have to wait until the party exists
                while (
                    !(await this.client.checkIfPartyExists(
                        preparedParty.partyId
                    ))
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            } else {
                throw e
            }
        }

        if (grantUserRights) {
            await this.client.grantUserRights(this.userId, partyId)
        }

        return { partyId }
    }

    /** Prepares, signs and submits a new external party topology in one step.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param privateKey The private key of the new external party, used to sign the topology transactions.
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @param confirmingThreshold optional parameter for multi-hosted parties (default is 1).
     * @param hostingParticipantEndpoints optional list of connection details for other participants to multi-host this party.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async signAndAllocateExternalParty(
        privateKey: PrivateKey,
        partyHint?: string,
        confirmingThreshold?: number,
        hostingParticipantEndpoints?: { accessToken: string; url: URL }[]
    ): Promise<GenerateTransactionResponse> {
        const otherHostingParticipantUids = await Promise.all(
            hostingParticipantEndpoints
                ?.map(
                    (endpoint) =>
                        new LedgerClient(
                            endpoint.url,
                            endpoint.accessToken,
                            this.logger
                        )
                )
                .map((client) =>
                    client
                        .get('/v2/parties/participant-id')
                        .then((res) => res.participantId)
                ) || []
        )

        const preparedParty = await this.generateExternalParty(
            getPublicKeyFromPrivate(privateKey),
            partyHint,
            confirmingThreshold,
            otherHostingParticipantUids
        )

        if (!preparedParty) {
            throw new Error('Error creating prepared party')
        }

        const signedHash = signTransactionHash(
            preparedParty.multiHash,
            privateKey
        )

        // grant user rights automatically if the party is hosted on 1 participant
        // if hosted on multiple participants, then we need to authorize each PartyToParticipant mapping
        // before granting the user rights
        const grantUserRights = !hostingParticipantEndpoints

        await this.allocateExternalParty(
            signedHash,
            preparedParty,
            grantUserRights
        )

        return preparedParty
    }

    /**
     * Performs the prepare step of the interactive submission flow.
     * @remarks The returned prepared transaction must be signed and executed using the executeSubmission method.
     * @param commands the commands to be executed.
     * @param commandId an unique identifier used to track the transaction, if not provided a random UUID will be used.
     * @param disclosedContracts additional contracts used to resolve contract & contract key lookups.
     */
    async prepareSubmission(
        commands: WrappedCommand | WrappedCommand[] | unknown,
        commandId?: string,
        disclosedContracts?: Types['DisclosedContract'][]
    ): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
        const commandArray = Array.isArray(commands) ? commands : [commands]
        const prepareParams: Types['JsPrepareSubmissionRequest'] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commandArray as any,
            commandId: commandId || v4(),
            userId: this.userId,
            actAs: [this.getPartyId()],
            readAs: [],
            disclosedContracts: disclosedContracts || [],
            synchronizerId: this.getSynchronizerId(),
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        return await retryable(() =>
            this.client.post(
                '/v2/interactive-submission/prepare',
                prepareParams
            )
        )
    }

    /**
     * Performs the execute step of the interactive submission flow.
     * @param prepared the prepared transaction from the prepareSubmission method.
     * @param signature the signed signature of the preparedTransactionHash from the prepareSubmission method.
     * @param publicKey the public key correlating to the private key used to sign the signature.
     * @param submissionId the unique identifier used to track the transaction, must be the same as used in prepareSubmission.
     */
    async executeSubmission(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        publicKey: PublicKey,
        submissionId: string
    ): Promise<string>
    /** @deprecated using the protobuf publickey is no longer supported -- use the string parameter instead */
    async executeSubmission(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        publicKey: SigningPublicKey,
        submissionId: string
    ): Promise<string>
    /** @deprecated using the protobuf publickey is no longer supported -- use the string parameter instead */
    async executeSubmission(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        publicKey: SigningPublicKey | PublicKey,
        submissionId: string
    ): Promise<string>
    async executeSubmission(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        publicKey: SigningPublicKey | PublicKey,
        submissionId: string
    ): Promise<string> {
        if (prepared.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }
        const transaction: string = prepared.preparedTransaction

        if (
            !this.verifyTxHash(
                prepared.preparedTransactionHash,
                publicKey,
                signature
            )
        ) {
            throw new Error('BAD SIGNATURE')
        }

        const request = {
            userId: this.userId,
            preparedTransaction: transaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: submissionId,
            deduplicationPeriod: {
                Empty: {},
            },
            partySignatures: {
                signatures: [
                    {
                        party: this.getPartyId(),
                        signatures: [
                            {
                                signature,
                                signedBy:
                                    TopologyController.createFingerprintFromPublicKey(
                                        publicKey
                                    ),
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                ],
            },
        }

        await retryable(() =>
            this.client.post('/v2/interactive-submission/execute', request)
        )
        return submissionId
    }

    /**
     * Performs the execute step of the interactive submission flow.
     * @param prepared the prepared transaction from the prepareSubmission method.
     * @param signature the signed signature of the preparedTransactionHash from the prepareSubmission method.
     * @param publicKey the public key correlating to the private key used to sign the signature.
     * @param submissionId the unique identifier used to track the transaction, must be the same as used in prepareSubmission.
     * @param timeoutMs The maximum time to wait in milliseconds.
     * @returns The completion value of the command.
     */
    async executeSubmissionAndWaitFor(
        prepared: PostResponse<'/v2/interactive-submission/prepare'>,
        signature: string,
        publicKey: SigningPublicKey | PublicKey,
        submissionId: string,
        timeoutMs: number = 15000
    ): Promise<Types['Completion']['value']> {
        const ledgerEnd = await this.ledgerEnd()
        await this.executeSubmission(
            prepared,
            signature,
            publicKey,
            submissionId
        )

        return this.waitForCompletion(
            ledgerEnd,
            timeoutMs,
            undefined,
            submissionId
        )
    }

    /**
     * This creates a simple Ping command, useful for testing signing and onboarding
     * @param partyId the party to receive the ping
     */
    createPingCommand(partyId: PartyId) {
        return [
            {
                CreateCommand: {
                    templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
                    createArguments: {
                        id: v4(),
                        initiator: this.getPartyId(),
                        responder: partyId,
                    },
                },
            },
        ]
    }

    /**
     * Submits a command for an internal party
     * @param commands the commands to be executed.
     * @param commandId an unique identifier used to track the transaction, if not provided a random UUID will be used.
     * @param disclosedContracts additional contracts used to resolve contract & contract key lookups.
    
     */
    async submitCommand(
        commands: WrappedCommand | WrappedCommand[] | unknown,
        commandId?: string,
        disclosedContracts?: Types['DisclosedContract'][]
    ) {
        const commandArray = Array.isArray(commands) ? commands : [commands]

        const request = {
            commands: commandArray,
            commandId: commandId || v4(),
            userId: this.userId,
            actAs: [this.getPartyId()],
            readAs: [],
            disclosedContracts: disclosedContracts || [],
            synchronizerId: this.getSynchronizerId(),
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        return await this.client.post('/v2/commands/submit-and-wait', request)
    }

    /**
     * Lists all wallets (parties) the user has access to.
     * use a pageToken from a previous request to query the next page.
     * @returns A paginated list of parties.
     */
    async listWallets(): Promise<PartyId[]> {
        const rights = await this.client.get('/v2/users/{user-id}/rights', {
            path: { 'user-id': this.userId },
        })

        if (rights.rights!.some((r) => 'CanReadAsAnyParty' in r.kind)) {
            return (await this.client.get('/v2/parties')).partyDetails!.map(
                (p) => p.party
            )
        } else {
            const canReadAsPartyRight = rights.rights?.find(
                (r) => 'CanReadAsParty' in r.kind
            ) as { CanReadAsParty?: { parties: PartyId[] } } | undefined
            if (
                canReadAsPartyRight &&
                canReadAsPartyRight.CanReadAsParty &&
                Array.isArray(canReadAsPartyRight.CanReadAsParty.parties)
            ) {
                return canReadAsPartyRight.CanReadAsParty.parties
            }
            return []
        }
    }

    /**
     * Lists all synchronizers the user has access to.
     * @param partyId a potential partyId for filtering.
     * @returns A list of connected synchronizers.
     */
    async listSynchronizers(
        partyId?: PartyId
    ): Promise<GetResponse<'/v2/state/connected-synchronizers'>> {
        const params: Record<string, unknown> = {
            query: { party: partyId ?? this.getPartyId() },
        }
        return await this.client.get(
            '/v2/state/connected-synchronizers',
            params
        )
    }

    /**
     * Creates a proxy for a delegate to create featured app markers jointly with using token standard workflows.
     * @param exchangeParty The delegate interacting with the token standard workflow
     * @param treasuryParty The app provider whose featured app right should be used.
     * @returns A delegate proxy create command
     */
    async createDelegateProxyCommand(
        exchangeParty: PartyId,
        treasuryParty: PartyId
    ) {
        return {
            CreateCommand: {
                templateId:
                    '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
                createArguments: {
                    provider: exchangeParty,
                    delegate: treasuryParty,
                },
            },
        }
    }

    /**
     * A function to grant either readAs or actAs rights
     */
    async grantRights(readAs?: PartyId[], actAs?: PartyId[]) {
        return await this.client.grantRights(this.userId, readAs, actAs)
    }

    /**
     * This creates a TransferPreapprovalCommand
     * And this allows us to auto accept incoming transfer for the receiver party
     * it is recommended to use the validator operator party as the provider party
     * this causes the transfer pre-approval to auto-renew
     * @param providerParty providing party retrieved through the getValidatorUser call
     * @param receiverParty party for which the auto accept is created for
     * @param dsoParty Party that the sender expects to represent the DSO party of the AmuletRules contract they are calling
     * dsoParty is required for splice-wallet package versions equal or higher than 0.1.11
     */

    async createTransferPreapprovalCommand(
        providerParty: PartyId,
        receiverParty: PartyId,
        dsoParty?: PartyId
    ) {
        const params: Record<string, unknown> = {
            query: {
                parties: this.getPartyId(),
                'package-name': 'splice-wallet',
            },
        }

        const spliceWalletPackageVersionResponse = await retryable(() =>
            this.client.get(
                '/v2/interactive-submission/preferred-package-version',
                params
            )
        )

        const version =
            spliceWalletPackageVersionResponse.packagePreference
                ?.packageReference?.packageVersion

        if (this.compareVersions(version!, '0.1.11') === -1) {
            return {
                CreateCommand: {
                    templateId:
                        '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                    createArguments: {
                        provider: providerParty,
                        receiver: receiverParty,
                    },
                },
            }
        } else {
            if (dsoParty) {
                return {
                    CreateCommand: {
                        templateId:
                            '#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal',
                        createArguments: {
                            provider: providerParty,
                            receiver: receiverParty,
                            expectedDso: dsoParty,
                        },
                    },
                }
            } else {
                new Error('dsoParty is undefined')
            }
        }
    }

    private compareVersions(v1: string, v2: string): number {
        const a = v1.split('.').map(Number)
        const b = v2.split('.').map(Number)
        const length = Math.max(a.length, b.length)

        for (let i = 0; i < length; i++) {
            const num1 = a[i] ?? 0
            const num2 = b[i] ?? 0

            if (num1 > num2) return 1
            if (num1 < num2) return -1
        }

        return 0
    }

    /**
     * Retrieves the current ledger end, useful for synchronization purposes.
     * @returns The current ledger end.
     */
    async ledgerEnd(): Promise<GetResponse<'/v2/state/ledger-end'>> {
        return await this.client.get('/v2/state/ledger-end')
    }

    /**
     * A way to validate that the app marker works as expected by
     * checking that the expected AppRewardCoupon is created by the SVs once the delegate transfer occurs
     */
    async getAppRewardCoupons() {
        const end = await this.ledgerEnd()

        return await this.activeContracts({
            offset: end.offset,
            parties: [this.getPartyId()],
            templateIds: ['#splice-amulet:Splice.Amulet:AppRewardCoupon'],
            filterByParty: true,
        })
    }

    /**
     * Retrieves active contracts with optional filtering by template IDs and parties.
     * @param options Optional parameters for filtering:
     *  - offset: The ledger offset to query active contracts at.
     *  - templateIds: An array of template IDs to filter the contracts.
     *  - parties: An array of parties to filter the contracts.
     *  - filterByParty: If true, filters contracts for each party individually; if false, filters for any known party.
     * @returns A list of active contracts matching the specified filters.
     */
    async activeContracts(options: {
        offset: number
        templateIds?: string[]
        parties?: string[] //TODO: Figure out if this should use this.partyId by default and not allow cross party filtering
        filterByParty?: boolean
    }): Promise<PostResponse<'/v2/state/active-contracts'>> {
        const filter: PostRequest<'/v2/state/active-contracts'> = {
            filter: {
                filtersByParty: {},
            },
            verbose: false,
            activeAtOffset: options?.offset,
        }

        // Helper to build TemplateFilter array
        const buildTemplateFilter = (templateIds?: string[]) => {
            if (!templateIds) return []
            return [
                {
                    identifierFilter: {
                        TemplateFilter: {
                            value: {
                                templateId: templateIds[0],
                                includeCreatedEventBlob: true, //TODO: figure out if this should be configurable
                            },
                        },
                    },
                },
            ]
        }

        if (
            options?.filterByParty &&
            options.parties &&
            options.parties.length > 0
        ) {
            // Filter by party: set filtersByParty for each party
            for (const party of options.parties) {
                filter.filter!.filtersByParty[party] = {
                    cumulative: options.templateIds
                        ? buildTemplateFilter(options.templateIds)
                        : [],
                }
            }
        } else if (options?.templateIds) {
            // Only template filter, no party
            filter.filter!.filtersForAnyParty = {
                cumulative: buildTemplateFilter(options.templateIds),
            }
        }

        //TODO: figure out if this should automatically be converted to a format that is more user friendly
        return await this.client.post('/v2/state/active-contracts', filter)
    }

    async uploadDar(
        darBytes: Uint8Array | Buffer
    ): Promise<PostResponse<'/v2/packages'> | void> {
        if (!this.isAdmin) {
            throw new Error('Use adminLedger to call uploadDar')
        }
        try {
            return await this.client.post(
                '/v2/packages',
                darBytes as never,
                {},
                {
                    bodySerializer: (b: unknown) => b, // prevents jsonification of bytes
                    headers: { 'Content-Type': 'application/octet-stream' },
                }
            )
        } catch (e: unknown) {
            // Check first for already uploaded error, which means dar upload status is ensured true
            if (isJsCantonError(e)) {
                const msg = [
                    e.code,
                    e.cause,
                    ...(e.context ? Object.values(e.context) : []),
                ]
                    .filter(Boolean)
                    .join(' ')

                const GRPC_ALREADY_EXISTS = 6 as const
                const alreadyExists =
                    e.code?.toUpperCase() === 'ALREADY_EXISTS' ||
                    e.grpcCodeValue === GRPC_ALREADY_EXISTS ||
                    /already\s*exist/i.test(msg) ||
                    (e as { status?: number }).status === 409

                if (alreadyExists) {
                    this.logger.info('DAR already present - continuing')
                    return
                }

                // In case of other errors throw
                this.logger.error({ errror: e }, 'DAR upload failed')
                throw e
            }
            this.logger.error({ error: e }, 'DAR upload failed')
            throw e
        }
    }

    async isPackageUploaded(packageId: string): Promise<boolean> {
        const { packageIds } = await this.client!.get('/v2/packages')
        return Array.isArray(packageIds) && packageIds.includes(packageId)
    }

    /**
     * grant "Master User" rights to a user.
     *
     * this require running with an admin token.
     *
     * @param userId The ID of the user to grant rights to.
     * @param canReadAsAnyParty define if the user can read as any party.
     * @param canExecuteAsAnyParty define if the user can execute as any party.
     */
    public async grantMasterUserRights(
        userId: string,
        canReadAsAnyParty: boolean,
        canExecuteAsAnyParty: boolean
    ) {
        if (!this.isAdmin) {
            throw new Error('Use adminLedger to call grantMasterUserRights')
        }

        return await this.client.grantMasterUserRights(
            userId,
            canReadAsAnyParty,
            canExecuteAsAnyParty
        )
    }

    /**
     * Create a new user.
     *
     * @param userId The ID of the user to create.
     * @param primaryParty The primary party of the user.
     */
    public async createUser(
        userId: string,
        primaryParty: PartyId
    ): Promise<components['schemas']['User']> {
        if (!this.isAdmin) {
            throw new Error('Use adminLedger to call createUser')
        }
        return await this.client.createUser(userId, primaryParty)
    }
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localLedgerDefault = (
    userId: string,
    token: string,
    isAdmin: boolean
): LedgerController => {
    return new LedgerController(
        userId,
        new URL('http://127.0.0.1:5003'),
        token,
        isAdmin
    )
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetLedgerDefault = (
    userId: string,
    token: string,
    isAdmin: boolean
): LedgerController => {
    return localNetLedgerAppUser(userId, token, isAdmin)
}

export const localNetLedgerAppUser = (
    userId: string,
    token: string,
    isAdmin: boolean
): LedgerController => {
    return new LedgerController(
        userId,
        new URL('http://127.0.0.1:2975'),
        token,
        isAdmin
    )
}

export const localNetLedgerAppProvider = (
    userId: string,
    token: string,
    isAdmin: boolean
): LedgerController => {
    return new LedgerController(
        userId,
        new URL('http://127.0.0.1:3975'),
        token,
        isAdmin
    )
}
