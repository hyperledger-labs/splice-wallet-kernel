// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    GenerateTransactionResponse,
    LedgerClient,
} from '@canton-network/core-ledger-client'
import {
    PrivateKey,
    PublicKey,
    signTransactionHash,
} from '@canton-network/core-signing-lib'
import pino from 'pino'
import { ParticipantEndpointConfig } from 'src/ledgerController'
import { v4 } from 'uuid'
import { WalletSdkContext } from '../sdk'

const logger = pino({ name: 'ExternalPartyClient', level: 'info' })

type CreatePartyOptions = Partial<{
    isAdmin: boolean
    partyHint: string
    confirmingThreshold: number
    confirmingParticipantEndpoints: ParticipantEndpointConfig[]
    observingParticipantEndpoints: ParticipantEndpointConfig[]
}>

type ExecuteOptions = {
    transactionResponse: GenerateTransactionResponse
    signedHash: string
}

export default class ExternalPartyClient {
    constructor(private readonly ctx: WalletSdkContext) {}

    public create(publicKey: PublicKey, options?: CreatePartyOptions) {
        const partyCreationPromise = Promise.all([
            this.getParticipantUids(
                options?.observingParticipantEndpoints ?? [],
                options?.isAdmin
            ),
            this.getParticipantUids(
                options?.confirmingParticipantEndpoints ?? [],
                options?.isAdmin
            ),
            this.ctx.ledgerClient.getSynchronizerId(),
        ]).then(
            ([
                otherHostingParticipantUids,
                observingParticipantUids,
                synchronizerId,
            ]) =>
                this.ctx.ledgerClient.generateTopology(
                    synchronizerId,
                    publicKey,
                    options?.partyHint ?? v4(),
                    false,
                    options?.confirmingThreshold ?? 1,
                    otherHostingParticipantUids,
                    observingParticipantUids
                )
        )

        return new PreparedPartyCreation(
            this.ctx,
            partyCreationPromise,
            options
        )
    }

    /**
     * Retrieves participant IDs from the given endpoints.
     * @param hostingParticipantConfigs - Participant endpoint configurations
     * @param isAdmin - Whether to use admin credentials
     * @returns Promise resolving to array of participant IDs
     */
    private async getParticipantUids(
        hostingParticipantConfigs: ParticipantEndpointConfig[],
        isAdmin = false
    ) {
        return Promise.all(
            hostingParticipantConfigs
                ?.map(
                    (endpoint) =>
                        new LedgerClient({
                            baseUrl: endpoint.url,
                            logger,
                            isAdmin,
                            accessToken: endpoint.accessToken,
                            accessTokenProvider: endpoint.accessTokenProvider,
                        })
                )
                .map((client) =>
                    client
                        .getWithRetry('/v2/parties/participant-id')
                        .then((res) => res.participantId)
                ) || []
        )
    }
}

export class PreparedPartyCreation {
    constructor(
        private readonly ctx: WalletSdkContext,
        private readonly partyCreationPromise: Promise<GenerateTransactionResponse>,
        private readonly createPartyOptions?: CreatePartyOptions
    ) {
        logger.info('Created party successfully.')
    }

    public sign(privateKey: PrivateKey) {
        const signedPartyPromise = this.partyCreationPromise.then(
            (transactionResponse) => ({
                transactionResponse,
                signedHash: signTransactionHash(
                    transactionResponse.multiHash,
                    privateKey
                ),
            })
        )
        return new SignedPartyCreation(
            this.ctx,
            signedPartyPromise,
            this.createPartyOptions
        )
    }
}

export class SignedPartyCreation {
    constructor(
        private readonly ctx: WalletSdkContext,
        private readonly signedPartyPromise: Promise<{
            transactionResponse: GenerateTransactionResponse
            signedHash: string
        }>,
        private readonly createPartyOptions?: CreatePartyOptions
    ) {
        logger.info('Signed party successfully.')
    }

    public async execute(
        userId: string,
        options?: Partial<{
            expectHeavyLoad?: boolean
            grantUserRights?: boolean
        }>
    ) {
        const { transactionResponse, signedHash } =
            await this.signedPartyPromise

        if (!transactionResponse || !signedHash)
            throw new Error(
                'There was a problem with creating or signing the party'
            )
        if (
            await this.ctx.ledgerClient.checkIfPartyExists(
                transactionResponse.partyId
            )
        ) {
            logger.info('Party already created.')
            return transactionResponse
        }

        const executeOptions: ExecuteOptions = {
            transactionResponse,
            signedHash,
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

        if (endpointConfig && transactionResponse.topologyTransactions) {
            await this.allocateExternalPartyForAdditionalParticipants({
                ...executeOptions,
                endpointConfig,
            })
        }

        if (options?.grantUserRights) {
            const HEAVY_LOAD_MAX_RETRIES = 100
            const HEAVY_LOAD_RETRY_INTERVAL = 5000
            await this.ctx.ledgerClient.waitForPartyAndGrantUserRights(
                userId,
                transactionResponse.partyId,
                options?.expectHeavyLoad ? HEAVY_LOAD_MAX_RETRIES : undefined,
                options?.expectHeavyLoad ? HEAVY_LOAD_RETRY_INTERVAL : undefined
            )
        }

        logger.info('Party allocated successfully.')
        return transactionResponse
    }

    /**
     * Allocates the party to additional participant nodes.
     * @param endpointConfig - Participant endpoints to allocate to
     * @param isAdmin - Whether to use admin credentials
     */
    private async allocateExternalPartyForAdditionalParticipants(
        options: {
            endpointConfig: ParticipantEndpointConfig[]
            isAdmin?: boolean
        } & ExecuteOptions
    ) {
        const {
            endpointConfig,
            transactionResponse,
            signedHash,
            isAdmin = false,
        } = options
        for (const endpoint of endpointConfig) {
            const defaultLedgerClient = new LedgerClient({
                baseUrl: endpoint.url,
                logger,
                isAdmin,
                accessToken: endpoint.accessToken,
                accessTokenProvider: endpoint.accessTokenProvider,
            })

            await this.executeAllocateParty({
                defaultLedgerClient,
                transactionResponse,
                signedHash,
            })
        }
    }

    /**
     * Performs the actual party allocation on a ledger client.
     * @param ledgerClient - The ledger client to allocate with
     * @param options - Optional execution options (withErrorHandling, expectHeavyLoad)
     */
    private async executeAllocateParty(
        options: {
            withErrorHandling?: boolean
            expectHeavyLoad?: boolean
            defaultLedgerClient?: LedgerClient
        } & ExecuteOptions
    ) {
        const {
            transactionResponse,
            signedHash,
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
                transactionResponse.topologyTransactions!.map(
                    (transaction) => ({
                        transaction,
                    })
                ),
                [
                    {
                        format: 'SIGNATURE_FORMAT_CONCAT',
                        signature: signedHash,
                        signedBy: transactionResponse.publicKeyFingerprint,
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
                logger.warn(
                    'Received timeout from ledger api when allocating party, however expecting heavy load is set to true'
                )
                // this is a timeout and we just have to wait until the party exists
                while (
                    !(await ledgerClient.checkIfPartyExists(
                        transactionResponse.partyId
                    ))
                ) {
                    await new Promise((resolve) => setTimeout(resolve, 1000))
                }
            } else {
                throw e
            }
        }
    }
}
