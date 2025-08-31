import {
    LedgerClient,
    PostResponse,
    PostRequest,
    GetResponse,
    JsPrepareSubmissionRequest,
    DisclosedContract,
} from '@canton-network/core-ledger-client'
import {
    signTransactionHash,
    getPublicKeyFromPrivate,
} from '@canton-network/core-signing-lib'
import { v4 } from 'uuid'
import { pino } from 'pino'
import { SigningPublicKey } from '@canton-network/core-ledger-client/src/_proto/com/digitalasset/canton/crypto/v30/crypto'
import { TopologyController } from './topologyController.js'

/**
 * Controller for interacting with the Ledger API, this is the primary interaction point with the validator node
 * using external signing.
 */
export class LedgerController {
    private client: LedgerClient
    private userId: string
    private partyId: string
    private synchronizerId: string
    private logger = pino({ name: 'LedgerController', level: 'debug' })

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param token the access token from the user, usually provided by an auth controller.
     */
    constructor(userId: string, baseUrl: string, token: string) {
        this.client = new LedgerClient(baseUrl, token, this.logger)
        this.userId = userId
        this.partyId = ''
        this.synchronizerId = ''
        return this
    }

    /**
     * Sets the party that the ledgerController will use for requests.
     * @param partyId
     */
    setPartyId(partyId: string): LedgerController {
        this.partyId = partyId
        return this
    }

    /**
     * Sets the synchronizerId that the ledgerController will use for requests.
     * @param synchronizerId
     */
    setSynchronizerId(synchronizerId: string): LedgerController {
        this.synchronizerId = synchronizerId
        return this
    }

    /**
     * Prepares, signs and executes a transaction on the ledger (using interactive submission).
     * @param commands the commands to be executed.
     * @param privateKey the private key to sign the transaction with.
     * @param commandId an unique identifier used to track the transaction, if not provided a random UUID will be used.
     */
    async prepareSignAndExecuteTransaction(
        commands: unknown,
        privateKey: string,
        commandId: string,
        disclosedContracts?: DisclosedContract[]
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
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

        return this.executeSubmission(prepared, signature, publicKey, commandId)
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
        disclosedContracts?: DisclosedContract[]
    ): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
        const prepareParams: JsPrepareSubmissionRequest = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commands as any,
            commandId: commandId || v4(),
            userId: this.userId,
            actAs: [this.partyId],
            readAs: [],
            disclosedContracts: disclosedContracts || [],
            synchronizerId: this.synchronizerId,
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
        publicKey: SigningPublicKey | string,
        submissionId: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
        if (prepared.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }
        const transaction: string = prepared.preparedTransaction

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
                        party: this.partyId,
                        signatures: [
                            {
                                signature,
                                signedBy:
                                    TopologyController.createFingerprintFromPublicKey(
                                        publicKey
                                    ),
                                format: 'SIGNATURE_FORMAT_RAW',
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
    createPingCommand(partyId: string) {
        return [
            {
                CreateCommand: {
                    templateId: '#AdminWorkflows:Canton.Internal.Ping:Ping',
                    createArguments: {
                        id: v4(),
                        initiator: this.partyId,
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
    return new LedgerController(userId, 'http://127.0.0.1:5003', token)
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetLedgerDefault = (
    userId: string,
    token: string
): LedgerController => {
    return new LedgerController(userId, 'http://127.0.0.1:2975', token)
}
