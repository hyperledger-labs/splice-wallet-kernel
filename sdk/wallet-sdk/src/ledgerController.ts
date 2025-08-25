import {
    LedgerClient,
    PostResponse,
    GetResponse,
} from '@splice/core-ledger-client'
import {
    signTransactionHash,
    getPublicKeyFromPrivate,
} from '@splice/core-signing-lib'
import { v4 } from 'uuid'
import { pino } from 'pino'
import { SigningPublicKey } from '@splice/core-ledger-client/src/_proto/com/digitalasset/canton/crypto/v30/crypto'
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
        commandId: string
    ): Promise<PostResponse<'/v2/interactive-submission/execute'>> {
        const prepared = await this.prepareSubmission(commands, commandId)

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
     */
    async prepareSubmission(
        commands: unknown,
        commandId?: string
    ): Promise<PostResponse<'/v2/interactive-submission/prepare'>> {
        const prepareParams = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commands as any,
            commandId: commandId || v4(),
            userId: this.userId,
            actAs: [this.partyId],
            readAs: [],
            disclosedContracts: [],
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
     * Lists all wallets (parties) the user has access to.
     */
    async listWallets(): Promise<GetResponse<'/v2/parties'>> {
        return await this.client.get('/v2/parties', {})
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
