// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    GenerateTransactionResponse,
    LedgerClient,
    TopologyWriteService,
} from '@canton-network/core-ledger-client'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
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
    private logger: Logger
    private ledgerClient: LedgerClient
    private synchronizerId: string | undefined

    constructor({
        synchronizerId,
        accessTokenProvider,
        httpLedgerUrl,
        logger,
        accessToken,
    }: {
        synchronizerId?: string
        accessTokenProvider: AccessTokenProvider
        httpLedgerUrl: string
        logger: Logger
        accessToken?: string
    }) {
        this.logger = logger
        this.synchronizerId = synchronizerId
        this.ledgerClient = new LedgerClient(
            new URL(httpLedgerUrl),
            this.logger,
            true,
            accessToken ?? '',
            accessTokenProvider
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

    /**
     * Create fingerprint
     * @param publicKey The public key of the user.
     */
    createFingerprintFromKey(publicKey: string): string

    createFingerprintFromKey(publicKey: string): string {
        return TopologyWriteService.createFingerprintFromKey(publicKey)
    }

    /**
     * Generate topology transactions
     * @param hint A hint for the party ID.
     * @param publicKey The public key of the user.
     */
    async generateTopologyTransactions(
        hint: string,
        publicKey: string
    ): Promise<GenerateTransactionResponse>

    async generateTopologyTransactions(
        hint: string,
        publicKey: string
    ): Promise<GenerateTransactionResponse> {
        const synchronizerId =
            this.synchronizerId ?? (await this.ledgerClient.getSynchronizerId())
        return this.ledgerClient.generateTopology(
            synchronizerId,
            publicKey,
            hint
        )
    }

    /**
     * Allocate party with wallet
     * @param namespace The namespace of wallet.
     * @param transactions There are topology transactions.
     * @param signature A transaction signature from signingProviderId
     * @param userId The ID of the user.
     */
    async allocatePartyWithExistingWallet(
        namespace: string,
        transactions: string[],
        signature: string,
        userId: string
    ): Promise<string>

    async allocatePartyWithExistingWallet(
        namespace: string,
        transactions: string[],
        signature: string,
        userId: string
    ): Promise<string> {
        const synchronizerId =
            this.synchronizerId ?? (await this.ledgerClient.getSynchronizerId())
        const res = await this.ledgerClient.allocateExternalParty(
            synchronizerId,
            transactions.map((transaction) => ({
                transaction,
            })),
            [
                {
                    format: 'SIGNATURE_FORMAT_CONCAT',
                    signature: signature,
                    signedBy: namespace,
                    signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                },
            ]
        )

        await this.ledgerClient.waitForPartyAndGrantUserRights(
            userId,
            res.partyId
        )
        return res.partyId
    }

    private async allocateInternalParty(
        userId: string,
        hint: string
    ): Promise<AllocatedParty> {
        const { participantId: namespace } =
            await this.ledgerClient.getWithRetry('/v2/parties/participant-id')

        const res = await this.ledgerClient.postWithRetry('/v2/parties', {
            partyIdHint: hint,
            identityProviderId: '',
        })

        if (!res.partyDetails?.party) {
            throw new Error('Failed to allocate party')
        }
        await this.ledgerClient.waitForPartyAndGrantUserRights(
            userId,
            res.partyDetails.party
        )

        return { hint, namespace, partyId: res.partyDetails.party }
    }

    private async allocateExternalParty(
        userId: string,
        hint: string,
        publicKey: string,
        signingCallback: SigningCbFn
    ): Promise<AllocatedParty> {
        const synchronizerId =
            this.synchronizerId ?? (await this.ledgerClient.getSynchronizerId())
        const namespace = this.createFingerprintFromKey(publicKey)

        const transactions = await this.generateTopologyTransactions(
            hint,
            publicKey
        )

        const signature = await signingCallback(transactions.multiHash)

        const res = await this.ledgerClient.allocateExternalParty(
            synchronizerId,
            transactions.topologyTransactions!.map((transaction) => ({
                transaction,
            })),
            [
                {
                    format: 'SIGNATURE_FORMAT_CONCAT',
                    signature: signature,
                    signedBy: namespace,
                    signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                },
            ]
        )

        await this.ledgerClient.waitForPartyAndGrantUserRights(
            userId,
            res.partyId
        )
        return { hint, partyId: res.partyId, namespace }
    }
}
