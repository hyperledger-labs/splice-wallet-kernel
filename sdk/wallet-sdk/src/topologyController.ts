import {
    LedgerClient,
    PreparedTransaction,
    SigningPublicKey,
    TopologyWriteService,
} from '@canton-network/core-ledger-client'
import {
    createKeyPair,
    getPublicKeyFromPrivate,
    signTransactionHash,
    KeyPair,
} from '@canton-network/core-signing-lib'
import { pino } from 'pino'
import { hashPreparedTransaction } from '@canton-network/core-tx-visualizer'

export type PreparedParty = {
    partyTransactions: Uint8Array<ArrayBufferLike>[]
    combinedHash: string
    txHashes: Buffer<ArrayBuffer>[]
    namespace: string
    partyId: string
}

export type AllocatedParty = {
    partyId: string
}

/**
 * TopologyController handles topology management tasks involving administrating external parties.
 * Since these parties require topology transactions to be signed by an admin user, this controller
 * requires an admin token to be provided.
 */
export class TopologyController {
    private readonly topologyClient: TopologyWriteService
    private readonly client: LedgerClient
    private readonly userId: string
    private logger = pino({ name: 'TopologyController', level: 'info' })

    constructor(
        adminApiUrl: string,
        baseUrl: string,
        userId: string,
        userAdminToken: string,
        synchronizerId: string
    ) {
        this.client = new LedgerClient(baseUrl, userAdminToken, this.logger)
        this.userId = userId
        this.topologyClient = new TopologyWriteService(
            synchronizerId,
            adminApiUrl,
            userAdminToken,
            this.client
        )
        return this
    }

    /** Creates a new Key pair of public and private key that can be used to allocate a new external party
     * @return KeyPair
     */
    static createNewKeyPair(): KeyPair {
        return createKeyPair()
    }

    /** Creates a transactionHash from a prepared transaction.
     * This is a utility function that uses the same hashing scheme as the ledger.
     * @param preparedTransaction
     */
    static createTransactionHash(
        preparedTransaction: string | PreparedTransaction
    ): Promise<string> {
        return hashPreparedTransaction(preparedTransaction, 'base64')
    }

    /** Creates a fingerprint from a public key.
     * This is a utility function that uses the same fingerprinting scheme as the ledger.
     * @param publicKey
     */
    static createFingerprintFromPublicKey(
        publicKey: SigningPublicKey | string
    ): string {
        return TopologyWriteService.createFingerprintFromKey(publicKey)
    }

    /** Creates a prepared topology transaction that can be signed and submitted in order th create a new external party.
     *
     * @param publicKey
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @returns A PreparedParty object containing the prepared transactions.
     */
    async prepareExternalPartyTopology(
        publicKey: string,
        partyHint?: string
    ): Promise<PreparedParty> {
        const namespace =
            TopologyController.createFingerprintFromPublicKey(publicKey)

        const partyId = partyHint
            ? `${partyHint}::${namespace}`
            : `${namespace.slice(0, 5)}::${namespace}`

        const transactions = await this.topologyClient
            .generateTransactions(publicKey, partyId)
            .then((resp) => resp.generatedTransactions)

        const txHashes = transactions.map((tx) =>
            Buffer.from(tx.transactionHash)
        )

        const partyTransactions = transactions.map(
            (tx) => tx.serializedTransaction
        )

        const combinedHash = TopologyWriteService.combineHashes(txHashes)

        const result = {
            partyTransactions,
            combinedHash,
            txHashes,
            namespace,
            partyId,
        }

        return Promise.resolve(result)
    }

    /** Submits a prepared and signed external party topology to the ledger.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param signedHash The signed combined hash of the prepared transactions.
     * @param preparedParty The prepared party object from prepareExternalPartyTopology.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async submitExternalPartyTopology(
        signedHash: string,
        preparedParty: PreparedParty
    ): Promise<AllocatedParty> {
        const signedTopologyTxs = preparedParty.partyTransactions.map(
            (transaction) =>
                TopologyWriteService.toSignedTopologyTransaction(
                    preparedParty.txHashes,
                    transaction,
                    signedHash,
                    preparedParty.namespace
                )
        )

        await this.topologyClient.submitExternalPartyTopology(
            signedTopologyTxs,
            preparedParty.partyId
        )
        await this.client.grantUserRights(this.userId, preparedParty.partyId)

        return { partyId: preparedParty.partyId }
    }

    /** Prepares, signs and submits a new external party topology in one step.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param privateKey The private key of the new external party, used to sign the topology transactions.
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async prepareSignAndSubmitExternalParty(
        privateKey: string,
        partyHint?: string
    ): Promise<AllocatedParty> {
        const preparedParty = await this.prepareExternalPartyTopology(
            getPublicKeyFromPrivate(privateKey),
            partyHint
        )
        const base64StringCombinedHash = Buffer.from(
            preparedParty?.combinedHash,
            'hex'
        ).toString('base64')

        const signedHash = signTransactionHash(
            base64StringCombinedHash,
            privateKey
        )
        return await this.submitExternalPartyTopology(signedHash, preparedParty)
    }
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTopologyDefault = (
    userId: string,
    userAdminToken: string
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:2902',
        'http://127.0.0.1:2975',
        userId,
        userAdminToken,
        //TODO: fetch this from a localnet API endpoint
        'global-domain::122098544e6d707a02edee40ff295792b2b526fa30fa7a284a477041eb23d1d26763'
    )
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localTopologyDefault = (
    userId: string,
    userAdminToken: string
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:5012',
        'http://127.0.0.1:5003',
        userId,
        userAdminToken,
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd'
    )
}
