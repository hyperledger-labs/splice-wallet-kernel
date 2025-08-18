import {
    LedgerClient,
    TopologyWriteService,
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
    MultiTransactionSignatures,
    SignedTopologyTransaction,
} from 'core-ledger-client'
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
            userId,
            partyIdHint: hint,
            identityProviderId: '',
            synchronizerId: this.synchronizerId,
        })

        if (!res.partyDetails?.party) {
            throw new Error('Failed to allocate party')
        }

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
            SignedTopologyTransaction.create({
                transaction: transaction.serializedTransaction,
                proposal: true,
                signatures: [],
                multiTransactionSignatures: [
                    MultiTransactionSignatures.create({
                        transactionHashes: txHashes,
                        signatures: [
                            Signature.create({
                                format: SignatureFormat.RAW,
                                signature: Buffer.from(signature, 'base64'),
                                signedBy: namespace,
                                signingAlgorithmSpec:
                                    SigningAlgorithmSpec.ED25519,
                            }),
                        ],
                    }),
                ],
            })
        )

        await this.topologyClient.addTransactions(signedTopologyTxs)
        await this.topologyClient.authorizePartyToParticipant(partyId)
        await this.ledgerClient.grantUserRights(userId, partyId)

        return { hint, partyId, namespace }
    }
}
