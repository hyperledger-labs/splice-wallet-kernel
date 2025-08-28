import {
    LedgerClient,
    TopologyWriteService,
} from '@canton-network/core-ledger-client'
import { Logger } from 'pino'

export type AllocatedParty = {
    partyId: string
    hint: string
    namespace: string
}

type SigningCbFn = (hash: string) => Promise<string>

/**
 * This service provides an abstraction for Canton party allocation that seamlessly handles both internal and external parties.
 */
export class PartyAllocationService {
    private ledgerClient: LedgerClient
    private topologyClient: TopologyWriteService

    constructor(
        private synchronizerId: string,
        adminToken: string,
        httpLedgerUrl: string,
        adminApiUrl: string,
        logger: Logger
    ) {
        this.ledgerClient = new LedgerClient(httpLedgerUrl, adminToken, logger)
        this.topologyClient = new TopologyWriteService(
            this.synchronizerId,
            adminApiUrl,
            adminToken,
            this.ledgerClient
        )
    }

    /**
     * Allocates an internal participant party for a user.
     * @param userId The ID of the user.
     * @param hint A hint for the party ID.
     */
    async allocateParty(userId: string, hint: string): Promise<AllocatedParty>

    /**
     * Allocates an externally signed party for a user.
     * @param userId The ID of the user.
     * @param hint A hint for the party ID.
     * @param publicKey The public key of the user.
     * @param signingCallback A callback function that asynchronously signs the onboarding request hash.
     */
    async allocateParty(
        userId: string,
        hint: string,
        publicKey: string,
        signingCallback: SigningCbFn
    ): Promise<AllocatedParty>

    async allocateParty(
        userId: string,
        hint: string,
        publicKey?: string,
        signingCallback?: SigningCbFn
    ): Promise<AllocatedParty> {
        if (publicKey !== undefined && signingCallback !== undefined) {
            return this.allocateExternalParty(
                userId,
                hint,
                publicKey,
                signingCallback
            )
        } else {
            return this.allocateInternalParty(userId, hint)
        }
    }

    private async allocateInternalParty(
        userId: string,
        hint: string
    ): Promise<AllocatedParty> {
        const { participantId: namespace } = await this.ledgerClient.get(
            '/v2/parties/participant-id'
        )

        const res = await this.ledgerClient.post('/v2/parties', {
            partyIdHint: hint,
            identityProviderId: '',
        })

        if (!res.partyDetails?.party) {
            throw new Error('Failed to allocate party')
        }
        await this.ledgerClient.grantUserRights(userId, res.partyDetails.party)

        return { hint, namespace, partyId: res.partyDetails.party }
    }

    private async allocateExternalParty(
        userId: string,
        hint: string,
        publicKey: string,
        signingCallback: SigningCbFn
    ): Promise<AllocatedParty> {
        const namespace =
            TopologyWriteService.createFingerprintFromKey(publicKey)
        const partyId = `${hint}::${namespace}`

        const transactions = await this.topologyClient
            .generateTransactions(publicKey, partyId)
            .then((resp) => resp.generatedTransactions)

        const txHashes = transactions.map((tx) =>
            Buffer.from(tx.transactionHash)
        )

        const combinedHash = TopologyWriteService.combineHashes(txHashes)

        const signature = await signingCallback(
            Buffer.from(combinedHash, 'hex').toString('base64')
        )

        const signedTopologyTxs = transactions.map((transaction) =>
            TopologyWriteService.toSignedTopologyTransaction(
                txHashes,
                transaction.serializedTransaction,
                signature,
                namespace
            )
        )

        await this.topologyClient.submitExternalPartyTopology(
            signedTopologyTxs,
            partyId
        )
        await this.ledgerClient.grantUserRights(userId, partyId)

        return { hint, partyId, namespace }
    }
}
