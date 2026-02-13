// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyClient } from './types'
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

const logger = pino({ name: 'ExternalPartyClient', level: 'info' })

type AllocationData = {
    preparedParty: GenerateTransactionResponse | null
    signedHash: string
    options: {
        confirmingParticipantEndpoints: ParticipantEndpointConfig[]
        observingParticipantEndpoints: ParticipantEndpointConfig[]
        synchronizerId: string
    }
}

const EMPTY_ALLOCATION_DATA: AllocationData = {
    preparedParty: null,
    signedHash: '',
    options: {
        confirmingParticipantEndpoints: [],
        observingParticipantEndpoints: [],
        synchronizerId: '',
    },
}

function assertPreparedParty(
    preparedParty: AllocationData['preparedParty']
): asserts preparedParty is NonNullable<AllocationData['preparedParty']> {
    if (!preparedParty) throw new Error('Need to create party first')
}

export default class ExternalPartyClient extends PartyClient {
    protected partyMode = 'external' as const
    private allocation: AllocationData = EMPTY_ALLOCATION_DATA
    private preparePartyPromise: Promise<
        AllocationData['preparedParty']
    > | null = null

    constructor(private ledgerClient: LedgerClient) {
        super()
    }

    /**
     * Initiates party creation with the given public key.
     * @param publicKey - The public key for the party
     * @param synchronizerId - The synchronizer ID
     * @param options - Optional configuration (party hint, participant endpoints, thresholds)
     * @returns this for method chaining
     */
    public create(
        publicKey: PublicKey,
        synchronizerId: string,
        options?: Partial<{
            isAdmin: boolean
            partyHint: string
            confirmingThreshold: number
            confirmingParticipantEndpoints: ParticipantEndpointConfig[]
            observingParticipantEndpoints: ParticipantEndpointConfig[]
        }>
    ) {
        this.resetAllocationData()

        this.preparePartyPromise = Promise.all(
            [
                options?.confirmingParticipantEndpoints,
                options?.observingParticipantEndpoints,
            ].map((endpoints) =>
                this.getParticipantUids(endpoints ?? [], options?.isAdmin)
            )
        ).then(([otherHostingParticipantUids, observingParticipantUids]) => {
            this.allocation.options.confirmingParticipantEndpoints =
                options?.confirmingParticipantEndpoints ?? []
            this.allocation.options.observingParticipantEndpoints =
                options?.observingParticipantEndpoints ?? []
            this.allocation.options.synchronizerId = synchronizerId

            return this.ledgerClient.generateTopology(
                synchronizerId,
                publicKey,
                options?.partyHint ?? v4(),
                false,
                options?.confirmingThreshold ?? 1,
                otherHostingParticipantUids,
                observingParticipantUids
            )
        })

        return this
    }

    /**
     * Signs the prepared party creation with the private key.
     * @param privateKey - The private key to sign with
     * @returns this for method chaining
     */
    public sign(privateKey: PrivateKey) {
        assertPreparedParty(this.allocation.preparedParty)

        this.allocation.signedHash = signTransactionHash(
            this.allocation.preparedParty.multiHash,
            privateKey
        )
        return this
    }

    /**
     * Executes the party allocation and optional post-allocation steps.
     * @param userId - The user ID for granting rights
     * @param options - Optional flags (expectHeavyLoad, grantUserRights)
     * @returns this for method chaining
     */
    public async execute(
        userId: string,
        options?: Partial<{
            expectHeavyLoad?: boolean
            grantUserRights?: boolean
        }>
    ) {
        await this.preparePartyPromise
        if (!this.allocation.preparedParty || !this.allocation.signedHash)
            throw new Error('Need to create and sign party first')

        if (
            await this.ledgerClient.checkIfPartyExists(
                this.allocation.preparedParty.partyId
            )
        )
            return this

        await this.executeAllocateParty(this.ledgerClient, {
            withErrorHandling: true,
            expectHeavyLoad: Boolean(options?.expectHeavyLoad),
        })

        const combinedParticipantEndpoints = [
            ...this.allocation.options.confirmingParticipantEndpoints,
            ...this.allocation.options.observingParticipantEndpoints,
        ]

        if (
            combinedParticipantEndpoints &&
            this.allocation.preparedParty.topologyTransactions
        ) {
            await this.allocateExternalPartyForAdditionalParticipants(
                combinedParticipantEndpoints
            )
        }

        if (options?.grantUserRights) {
            const HEAVY_LOAD_MAX_RETRIES = 100
            const HEAVY_LOAD_RETRY_INTERVAL = 5000
            await this.ledgerClient.waitForPartyAndGrantUserRights(
                userId,
                this.allocation.preparedParty.partyId,
                options?.expectHeavyLoad ? HEAVY_LOAD_MAX_RETRIES : undefined,
                options?.expectHeavyLoad ? HEAVY_LOAD_RETRY_INTERVAL : undefined
            )
        }

        return this
    }

    /**
     * Returns the prepared party object.
     */
    public get party() {
        return this.allocation.preparedParty
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

    /**
     * Resets internal allocation state.
     */
    private resetAllocationData() {
        this.allocation = EMPTY_ALLOCATION_DATA
        this.preparePartyPromise = null
    }

    /**
     * Allocates the party to additional participant nodes.
     * @param endpointConfig - Participant endpoints to allocate to
     * @param isAdmin - Whether to use admin credentials
     */
    private async allocateExternalPartyForAdditionalParticipants(
        endpointConfig: ParticipantEndpointConfig[],
        isAdmin = false
    ) {
        for (const endpoint of endpointConfig) {
            const lc = new LedgerClient({
                baseUrl: endpoint.url,
                logger,
                isAdmin,
                accessToken: endpoint.accessToken,
                accessTokenProvider: endpoint.accessTokenProvider,
            })

            await this.executeAllocateParty(lc)
        }
    }

    /**
     * Performs the actual party allocation on a ledger client.
     * @param ledgerClient - The ledger client to allocate with
     * @param options - Optional execution options (withErrorHandling, expectHeavyLoad)
     */
    private async executeAllocateParty(
        ledgerClient: LedgerClient,
        options?: Partial<{
            withErrorHandling: boolean
            expectHeavyLoad: boolean
        }>
    ) {
        assertPreparedParty(this.allocation.preparedParty)
        try {
            await ledgerClient.allocateExternalParty(
                this.allocation.options.synchronizerId,
                this.allocation.preparedParty!.topologyTransactions!.map(
                    (transaction) => ({
                        transaction,
                    })
                ),
                [
                    {
                        format: 'SIGNATURE_FORMAT_CONCAT',
                        signature: this.allocation.signedHash,
                        signedBy:
                            this.allocation.preparedParty!.publicKeyFingerprint,
                        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                    },
                ]
            )
        } catch (e) {
            if (!options?.withErrorHandling) throw e

            const errorMsg =
                typeof e === 'string' ? e : e instanceof Error ? e.message : ''
            if (
                options?.expectHeavyLoad &&
                errorMsg.includes(
                    'The server was not able to produce a timely response to your request'
                )
            ) {
                logger.warn(
                    'Received timeout from ledger api when allocating party, however expecting heavy load is set to true'
                )
                // this is a timeout and we just have to wait until the party exists
                while (
                    !(await this.ledgerClient.checkIfPartyExists(
                        this.allocation.preparedParty.partyId
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
