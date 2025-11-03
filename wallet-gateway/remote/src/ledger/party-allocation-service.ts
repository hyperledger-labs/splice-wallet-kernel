// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    LedgerClient,
    TopologyWriteService,
} from '@canton-network/core-ledger-client'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { Logger } from 'pino'

export type AllocatedParty = {
    partyId: string
    hint: string
    namespace: string
    transactions?: string[]
}

type SigningCbFn = (hash: string) => Promise<string>

/**
 * This service provides an abstraction for Canton party allocation that seamlessly handles both internal and external parties.
 */
export class PartyAllocationService {
    private ledgerClient: LedgerClient

    constructor(
        private synchronizerId: string,
        accessTokenProvider: AccessTokenProvider,
        httpLedgerUrl: string,
        private logger: Logger,
        accessToken: string = ''
    ) {
        this.ledgerClient = new LedgerClient(
            new URL(httpLedgerUrl),
            this.logger,
            true,
            accessToken,
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

    public allocatePartyWithExistingWallet(
        namespace: string,
        transactions: string[],
        signature: string,
        userId: string
    ): Promise<string> {
        return this.allocateExternalPartyWithExistingWallet(
            namespace,
            transactions,
            signature,
            userId
        )
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
        const namespace =
            TopologyWriteService.createFingerprintFromKey(publicKey)

        const transactions = await this.ledgerClient.generateTopology(
            this.synchronizerId,
            publicKey,
            hint
        )

        const signature = await signingCallback(transactions.multiHash)

        if (!signature) {
            return {
                hint,
                partyId: '',
                namespace,
                transactions: transactions.topologyTransactions!.map(
                    (transaction) => transaction
                ),
            }
        }

        const res = await this.ledgerClient.allocateExternalParty(
            this.synchronizerId,
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

    private async allocateExternalPartyWithExistingWallet(
        namespace: string,
        transactions: string[],
        signature: string,
        userId: string
    ): Promise<string> {
        const res = await this.ledgerClient.allocateExternalParty(
            this.synchronizerId,
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
}
