import { LedgerClient } from 'core-ledger-client'
import { TopologyWriteService } from './TopologyWriteService.js'
import { Logger } from 'pino'
import {
    Signature,
    SignatureFormat,
    SigningAlgorithmSpec,
} from '../_proto/com/digitalasset/canton/crypto/v30/crypto.js'
import {
    MultiTransactionSignatures,
    SignedTopologyTransaction,
} from '../_proto/com/digitalasset/canton/protocol/v30/topology.js'

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

    async allocateParty(userId: string, hint: string): Promise<AllocatedParty>
    async allocateParty(
        userId: string,
        hint: string,
        options: { publicKey: string; signingCallback: SigningCbFn }
    ): Promise<AllocatedParty>
    async allocateParty(
        userId: string,
        hint: string,
        options?: { publicKey?: string; signingCallback?: SigningCbFn }
    ): Promise<AllocatedParty> {
        const { publicKey, signingCallback } = options || {}
        // Implementation for allocating a party to a user

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
