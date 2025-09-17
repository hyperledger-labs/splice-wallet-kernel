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
import { SigningPublicKey } from '@canton-network/core-ledger-client/src/_proto/com/digitalasset/canton/crypto/v30/crypto'
import { TopologyController } from './topologyController.js'
import { PartyId } from '@canton-network/core-types'

/**
 * Controller for interacting with the Ledger API, this is the primary interaction point with the validator node
 * using external signing.
 */
export class LedgerController {
    private client: LedgerClient
    private userId: string
    private partyId: PartyId | undefined
    private synchronizerId: PartyId | undefined
    private logger = pino({ name: 'LedgerController', level: 'info' })

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param token the access token from the user, usually provided by an auth controller.
     */
    constructor(userId: string, baseUrl: URL, token: string) {
        this.client = new LedgerClient(baseUrl, token, this.logger)
        this.userId = userId
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
        publicKey: SigningPublicKey | PublicKey,
        signature: string
    ) {
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
     * @returns the commandId used to track the transaction.
     */
    async prepareSignAndExecuteTransaction(
        commands: unknown,
        privateKey: PrivateKey,
        commandId: string,
        disclosedContracts?: Types['DisclosedContract'][]
    ): Promise<string> {
        const prepared = await this.prepareSubmission(
            commands,
            commandId,
            disclosedContracts
        )

        const signature = signTransactionHash(
            prepared.preparedTransactionHash,
            privateKey
        )
        const publicKey = getPublicKeyFromPrivate(privateKey)

        await this.executeSubmission(prepared, signature, publicKey, commandId)
        return commandId
    }

    /**
     * Waits for a command to be completed by polling the completions endpoint.
     * @param commandId The ID of the command to wait for.
     * @param beginExclusive The offset to start polling from.
     * @param timeoutMs The maximum time to wait in milliseconds.
     * @returns The completion value of the command.
     * @throws An error if the timeout is reached before the command is completed.
     */
    async waitForCompletion(
        ledgerEnd: number,
        timeoutMs: number,
        commandId?: string,
        submissionId?: string
    ): Promise<Types['Completion']['value']> {
        const completionPromise = awaitCompletion(
            this.client,
            ledgerEnd,
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
    async allocateInternalParty(
        partyHint?: string
    ): Promise<PostResponse<'/v2/parties'>> {
        return await this.client.post('/v2/parties', {
            partyIdHint: partyHint || v4(),
            identityProviderId: '',
        })
    }

    /**
     * Performs the prepare step of the interactive submission flow.
     * @remarks The returned prepared transaction must be signed and executed using the executeSubmission method.
     * @param commands the commands to be executed.
     * @param commandId an unique identifier used to track the transaction, if not provided a random UUID will be used.
     * @param disclosedContracts additional contracts used to resolve contract & contract key lookups.
     */
    async prepareSubmission(
        commands: unknown,
        commandId?: string,
        disclosedContracts?: Types['DisclosedContract'][]
    ): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
        const prepareParams: Types['JsPrepareSubmissionRequest'] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commands as any,
            commandId: commandId || v4(),
            userId: this.userId,
            actAs: [this.getPartyId()],
            readAs: [],
            disclosedContracts: disclosedContracts || [],
            synchronizerId: this.getSynchronizerId(),
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        return await this.client.post(
            '/v2/interactive-submission/prepare',
            prepareParams
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
        publicKey: SigningPublicKey | PublicKey,
        submissionId: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
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

        return await this.client.post(
            '/v2/interactive-submission/execute',
            request
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
     * Lists all wallets (parties) the user has access to.
     * use a pageToken from a previous request to query the next page.
     * @param options Optional query parameters: pageSize, pageToken, identityProviderId
     * @returns A paginated list of parties.
     */
    async listWallets(options?: {
        pageSize?: number
        pageToken?: string
        identityProviderId?: string
    }): Promise<GetResponse<'/v2/parties'>> {
        const params: Record<string, unknown> = {}
        if (options?.pageSize !== undefined) params.pageSize = options.pageSize
        if (options?.pageToken !== undefined)
            params.pageToken = options.pageToken
        if (options?.identityProviderId !== undefined)
            params.identityProviderId = options.identityProviderId
        return await this.client.get('/v2/parties', params)
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
     * This creates a TransferPreapprovalCommand
     * The validator auto accepts when the provider is the validator operatory party
     * And this allows us to auto accept incoming transfer for the receiver party
     * @param validatorOperatorParty operator party retrieved through the getValidatorUser call
     * @param receiverParty party for which the auto accept is created for
     * @param dsoParty Party that the sender expects to represent the DSO party of the AmuletRules contract they are calling
     * dsoParty is required for splice-wallet package versions equal or higher than 0.1.11
     */

    async createTransferPreapprovalCommand(
        validatorOperatorParty: PartyId,
        receiverParty: PartyId,
        dsoParty?: PartyId
    ) {
        const params: Record<string, unknown> = {
            query: {
                parties: this.getPartyId(),
                'package-name': 'splice-wallet',
            },
        }

        const spliceWalletPackageVersionResponse = await this.client.get(
            '/v2/interactive-submission/preferred-package-version',
            params
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
                        provider: validatorOperatorParty,
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
                            provider: validatorOperatorParty,
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
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localLedgerDefault = (
    userId: string,
    token: string
): LedgerController => {
    return new LedgerController(userId, new URL('http://127.0.0.1:5003'), token)
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetLedgerDefault = (
    userId: string,
    token: string
): LedgerController => {
    return new LedgerController(userId, new URL('http://127.0.0.1:2975'), token)
}
