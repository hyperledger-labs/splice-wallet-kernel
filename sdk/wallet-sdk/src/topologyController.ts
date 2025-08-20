import {
    LedgerClient,
    PostResponse,
    TopologyWriteService,
    GenerateTransactionsResponse_GeneratedTransaction,
} from 'core-ledger-client'
import { signTransactionHash } from 'core-signing-lib'
import { pino } from 'pino'

export type PartyTransaction = {
    txRaw: Uint8Array<ArrayBufferLike>
    txHash: Buffer<ArrayBuffer>
}

export type PreparedParty = {
    partyTransactions: PartyTransaction[]
    combinedHash: string
    txHashes: Buffer<ArrayBuffer>[]
    namespace: string
    partyId: string
}

export type AllocatedParty = {
    partyId: string
}

export interface topologyController {
    setSynchronizerId(synchronizerId: string): TopologyController

    allocateInternalParty(
        partyHint: string
    ): Promise<PostResponse<'/v2/parties'>>

    prepareExternalPartyTopology(
        publicKey: string,
        partyHint?: string
    ): Promise<PreparedParty>

    submitExternalPartyTopology(
        signedHash: string,
        preparedParty: PreparedParty
    ): Promise<AllocatedParty>
}

export class TopologyController implements topologyController {
    private topologyClient: TopologyWriteService
    private client: LedgerClient
    private synchronizerId: string
    private userId: string
    private logger = pino({ name: 'TopologyController', level: 'debug' })

    constructor(
        adminApiUrl: string,
        baseUrl: string,
        userId: string,
        userAdminToken: string
    ) {
        this.client = new LedgerClient(baseUrl, userAdminToken, this.logger)
        this.synchronizerId = ''
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

    toPartyTransaction(
        tx: GenerateTransactionsResponse_GeneratedTransaction
    ): PartyTransaction {
        const txHash = Buffer.from(tx.transactionHash)
        const txRaw = tx.serializedTransaction

        return { txRaw, txHash }
    }

    async prepareExternalPartyTopology(
        publicKey: string,
        partyHint?: string
    ): Promise<PreparedParty> {
        const namespace =
            TopologyWriteService.createFingerprintFromKey(publicKey)

        const partyId = partyHint
            ? `${partyHint}::${namespace}`
            : `${publicKey}::${namespace}`

        const transactions = await this.topologyClient
            .generateTransactions(publicKey, partyId)
            .then((resp) => resp.generatedTransactions)

        const txHashes = transactions.map((tx) =>
            Buffer.from(tx.transactionHash)
        )

        const partyTransactions = transactions.map((tx) =>
            this.toPartyTransaction(tx)
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
                    transaction.txRaw,
                    signedHash,
                    preparedParty.namespace
                )
        )

        await this.topologyClient.addTransactions(signedTopologyTxs)
        await this.topologyClient.authorizePartyToParticipant(
            preparedParty.namespace
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
            partyHint,
            publicKey
        )
        const signedHash = signTransactionHash(
            preparedParty.combinedHash,
            privateKey
        )
        return await this.submitExternalPartyTopology(signedHash, preparedParty)
    }
}
