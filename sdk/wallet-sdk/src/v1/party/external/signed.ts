// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { ParticipantEndpointConfig } from '../../../ledgerController.js'
import { WalletSdkContext } from '../../sdk.js'
import { CreatePartyOptions, ExecuteOptions } from './types.js'
import pino from 'pino'

export class SignedPartyCreation {
    constructor(
        private readonly ctx: WalletSdkContext,
        private readonly signedPartyPromise: Promise<ExecuteOptions>,
        private readonly createPartyOptions?: CreatePartyOptions
    ) {}

    /**
     * Executes the party allocation on the ledger and optionally grants user rights.
     * Handles synchronizer lookup, party allocation, and additional participant synchronization.
     * @param options - Optional execution flags (expectHeavyLoad for timeout handling, grantUserRights to add user permissions)
     * @returns The confirmed GenerateTransactionResponse containing party details
     */
    public async execute(
        options?: Partial<{
            expectHeavyLoad?: boolean
            grantUserRights?: boolean
        }>
    ) {
        const { party, signature } = await this.signedPartyPromise

        if (!party || !signature)
            throw new Error(
                'There was a problem with creating or signing the party'
            )
        if (await this.ctx.ledgerClient.checkIfPartyExists(party.partyId)) {
            this.ctx.logger.info('Party already created.')
            return party
        }

        const executeOptions: ExecuteOptions = {
            party,
            signature,
        }

        await this.executeAllocateParty({
            ...executeOptions,
            withErrorHandling: true,
            expectHeavyLoad: Boolean(options?.expectHeavyLoad),
        })

        const endpointConfig = [
            ...(this.createPartyOptions?.confirmingParticipantEndpoints ?? []),
            ...(this.createPartyOptions?.observingParticipantEndpoints ?? []),
        ]

        if (endpointConfig && party.topologyTransactions) {
            await this.allocateExternalPartyForAdditionalParticipants({
                ...executeOptions,
                endpointConfig,
            })
        }

        const grantUserRights = options?.grantUserRights ?? true

        if (grantUserRights) {
            const HEAVY_LOAD_MAX_RETRIES = 100
            const HEAVY_LOAD_RETRY_INTERVAL = 5000
            await this.ctx.ledgerClient.waitForPartyAndGrantUserRights(
                this.ctx.userId,
                party.partyId,
                options?.expectHeavyLoad ? HEAVY_LOAD_MAX_RETRIES : undefined,
                options?.expectHeavyLoad ? HEAVY_LOAD_RETRY_INTERVAL : undefined
            )
        }

        this.ctx.logger.info('Party allocated successfully.')
        return party
    }

    /**
     * Allocates the prepared party to additional participant nodes.
     * Ensures the party topology is synchronized across confirming and observing participants.
     * @param options - Execution options including endpoints, transaction response, signed hash, and optional admin flag
     */
    private async allocateExternalPartyForAdditionalParticipants(
        options: {
            endpointConfig: ParticipantEndpointConfig[]
            isAdmin?: boolean
        } & ExecuteOptions
    ) {
        const { endpointConfig, party, signature, isAdmin = false } = options
        for (const endpoint of endpointConfig) {
            const defaultLedgerClient = new LedgerClient({
                baseUrl: endpoint.url,
                logger: this.ctx.logger as unknown as pino.Logger, // TODO: change the type assertion once LedgerClient is revamped
                isAdmin,
                accessToken: endpoint.accessToken,
                accessTokenProvider: endpoint.accessTokenProvider,
            })

            await this.executeAllocateParty({
                defaultLedgerClient,
                party,
                signature,
            })
        }
    }

    /**
     * Performs the actual party allocation transaction on a ledger client.
     * Includes error handling for timeout scenarios when heavy load is expected.
     * @param options - Allocation options including transaction data, ledger client, and optional error handling flags
     */
    private async executeAllocateParty(
        options: {
            withErrorHandling?: boolean
            expectHeavyLoad?: boolean
            defaultLedgerClient?: LedgerClient
        } & ExecuteOptions
    ) {
        const {
            party,
            signature,
            withErrorHandling,
            expectHeavyLoad,
            defaultLedgerClient,
        } = options
        const ledgerClient = defaultLedgerClient ?? this.ctx.ledgerClient
        try {
            const synchronizerId =
                await this.ctx.scanProxyClient.getAmuletSynchronizerId()
            if (!synchronizerId) throw new Error('Cannot find synchronizer ID')
            await ledgerClient.allocateExternalParty(
                synchronizerId,
                party.topologyTransactions!.map((transaction) => ({
                    transaction,
                })),
                [
                    {
                        format: 'SIGNATURE_FORMAT_CONCAT',
                        signature,
                        signedBy: party.publicKeyFingerprint,
                        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                    },
                ]
            )
        } catch (e) {
            if (!withErrorHandling) throw e

            const errorMsg =
                typeof e === 'string' ? e : e instanceof Error ? e.message : ''
            if (
                expectHeavyLoad &&
                errorMsg.includes(
                    'The server was not able to produce a timely response to your request'
                )
            ) {
                this.ctx.logger.warn(
                    'Received timeout from ledger api when allocating party, however expecting heavy load is set to true'
                )
                // this is a timeout and we just have to wait until the party exists
                while (
                    !(await ledgerClient.checkIfPartyExists(party.partyId))
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            } else {
                throw e
            }
        }
    }
}
