import {
    LedgerClient,
    PostResponse,
    TopologyWriteService,
} from '@splice/core-ledger-client'
import { signTransactionHash } from '@splice/core-signing-lib'
import { pino } from 'pino'

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

export class TopologyController {
    private topologyClient: TopologyWriteService
    private client: LedgerClient
    private synchronizerId: string
    private userId: string
    private logger = pino({ name: 'TopologyController', level: 'debug' })

    constructor(
        adminApiUrl: string,
        baseUrl: string,
        userId: string,
        userAdminToken: string,
        synchronizerId: string
    ) {
        this.client = new LedgerClient(baseUrl, userAdminToken, this.logger)
        this.synchronizerId = synchronizerId
        this.userId = userId
        this.topologyClient = new TopologyWriteService(
            this.synchronizerId,
            adminApiUrl,
            userAdminToken,
            this.client
        )
        return this
    }

    setSynchronizerId(synchronizerId: string): TopologyController {
        this.synchronizerId = synchronizerId
        return this
    }

    async prepareExternalPartyTopology(
        publicKey: string,
        partyHint?: string
    ): Promise<PreparedParty> {
        const namespace =
            TopologyWriteService.createFingerprintFromKey(publicKey)

        //can't use base64 encoded public key because it has invalid charcters
        const partyId = partyHint
            ? `${partyHint}::${namespace}`
            : `${publicKey}::${namespace}`

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

        await this.topologyClient.addTransactions(signedTopologyTxs)
        await this.topologyClient.authorizePartyToParticipant(
            preparedParty.partyId
        )
        await this.client.grantUserRights(this.userId, preparedParty.partyId)

        return { partyId: preparedParty.partyId }
    }

    async allocateInternalParty(
        partyHint: string
    ): Promise<PostResponse<'/v2/parties'>> {
        return await this.client.post('/v2/parties', {
            partyIdHint: partyHint,
            identityProviderId: '',
        })
    }

    async prepareSignAndSubmitExternalParty(
        partyHint: string,
        publicKey: string,
        privateKey: string
    ): Promise<AllocatedParty> {
        const preparedParty = await this.prepareExternalPartyTopology(
            publicKey,
            partyHint
        )
        const signedHash = signTransactionHash(
            preparedParty.combinedHash,
            privateKey
        )
        return await this.submitExternalPartyTopology(signedHash, preparedParty)
    }
}

export const localNetTopologyDefault = (
    userId: string,
    userAdminToken: string
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:2902',
        'http://127.0.0.1:2975',
        userId,
        userAdminToken,
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd'
    )
}

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
