// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import {
    GrpcClientOptions,
    TopologyWriteService,
} from './topologyWriteService.js'
import {
    createKeyPair,
    getPublicKeyFromPrivate,
    signTransactionHash,
    KeyPair,
    PrivateKey,
    PublicKey,
} from '@canton-network/core-signing-lib'
import { pino } from 'pino'
import {
    hashPreparedTransaction,
    computeMultiHashForTopology,
    computeSha256CantonHash,
} from '@canton-network/core-tx-visualizer'
import { PartyId } from '@canton-network/core-types'
import {
    Enums_ParticipantPermission,
    PreparedTransaction,
    SigningPublicKey,
} from '@canton-network/core-ledger-proto'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
export { Enums_ParticipantPermission } from '@canton-network/core-ledger-proto'

export type PreparedParty = {
    partyTransactions: Uint8Array<ArrayBufferLike>[]
    combinedHash: string
    txHashes: Buffer<ArrayBuffer>[]
    namespace: string
    partyId: PartyId
}

export type AllocatedParty = {
    partyId: PartyId
}

export type MultiHostPartyParticipantConfig = {
    adminApiUrl: string
    baseUrl: URL
    accessToken?: string
    accessTokenProvider?: AccessTokenProvider
}
/**
 * TopologyController handles topology management tasks involving administrating external parties.
 * Since these parties require topology transactions to be signed by an admin user, this controller
 * requires an admin token to be provided.
 */
export class TopologyController {
    private readonly topologyClient: TopologyWriteService
    private readonly client: LedgerClient
    private readonly userId: string
    private logger = pino({ name: 'TopologyController', level: 'info' })

    constructor(
        adminApiUrl: string,
        baseUrl: URL,
        userId: string,
        synchronizerId: PartyId,
        accessToken: string = '',
        accessTokenProvider?: AccessTokenProvider,
        grpcClientOptions?: GrpcClientOptions
    ) {
        this.client = new LedgerClient({
            baseUrl,
            logger: this.logger,
            isAdmin: true,
            accessToken,
            accessTokenProvider,
        })
        this.userId = userId
        this.topologyClient = new TopologyWriteService(
            synchronizerId,
            adminApiUrl,
            this.client,
            accessToken,
            accessTokenProvider,
            grpcClientOptions
        )
        return this
    }

    /** Creates a new Key pair of public and private key that can be used to allocate a new external party
     * @return KeyPair
     */
    static createNewKeyPair(): KeyPair {
        return createKeyPair()
    }

    /** Creates a transactionHash from a prepared transaction.
     * This is a utility function that uses the same hashing scheme as the ledger.
     * @param preparedTransaction
     */
    static createTransactionHash(
        preparedTransaction: string | PreparedTransaction
    ): Promise<string> {
        return hashPreparedTransaction(preparedTransaction, 'base64')
    }
    /** Creates a fingerprint from a public key.
     * This is a utility function that uses the same fingerprinting scheme as the ledger.
     * @param publicKey
     */
    static createFingerprintFromPublicKey(
        publicKey: SigningPublicKey | PublicKey
    ): string {
        return TopologyWriteService.createFingerprintFromKey(publicKey)
    }

    /** Creates a prepared topology transaction that can be signed and submitted in order th create a new external party.
     *
     * @deprecated Use LedgerController.generateExternalParty instead
     *
     * @param publicKey
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @param confirmingThreshold optional parameter for multi-hosted parties (default is 1).
     * @param hostingParticipantPermissions optional participant permission for multi-hosted party.
     * @returns A PreparedParty object containing the prepared transactions.
     */
    async prepareExternalPartyTopology(
        publicKey: PublicKey,
        partyHint?: string,
        confirmingThreshold?: number,
        hostingParticipantPermissions?: Map<string, Enums_ParticipantPermission>
    ): Promise<PreparedParty> {
        const namespace =
            TopologyController.createFingerprintFromPublicKey(publicKey)
        const partyId: PartyId = partyHint
            ? `${partyHint}::${namespace}`
            : `${namespace.slice(0, 5)}::${namespace}`

        const transactions = await this.topologyClient
            .generateTransactions(
                publicKey,
                partyId,
                confirmingThreshold,
                hostingParticipantPermissions
            )
            .then((resp) => resp.generatedTransactions)

        const txHashes = transactions.map((tx) =>
            Buffer.from(tx.transactionHash)
        )

        const partyTransactions = transactions.map(
            (tx) => tx.serializedTransaction
        )

        const combinedHash = TopologyWriteService.combineHashes(txHashes)

        const computedHash =
            await TopologyController.computeTopologyTxHash(partyTransactions)

        if (combinedHash !== computedHash) {
            this.logger.error(
                `Calculated hash doesn't match hash from the ledger api. Got ${combinedHash}, expected ${computedHash}`
            )
        }

        const result = {
            partyTransactions,
            combinedHash,
            txHashes,
            namespace,
            partyId,
        }

        return Promise.resolve(result)
    }

    /** Calculates the MultiTopologyTransaction hash
     * @param preparedTransactions The 3 topology transactions from the generateTransactions endpoint
     */
    static async computeTopologyTxHash(
        preparedTransactions: Uint8Array<ArrayBufferLike>[] | string[]
    ) {
        let normalized: Uint8Array<ArrayBufferLike>[] = []
        if (typeof preparedTransactions[0] === 'string') {
            normalized = (preparedTransactions as string[]).map((tx) =>
                Buffer.from(tx, 'base64')
            )
        } else {
            normalized = preparedTransactions as Uint8Array<ArrayBufferLike>[]
        }

        const rawHashes = await Promise.all(
            normalized.map((tx) => computeSha256CantonHash(11, tx))
        )
        const combinedHashes = await computeMultiHashForTopology(rawHashes)

        const computedHash = await computeSha256CantonHash(55, combinedHashes)

        return Buffer.from(computedHash).toString('base64')
    }

    /** Submits a prepared and signed external party topology to the ledger.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     *
     * @deprecated Use LedgerController.allocateExternalParty instead
     *
     * @param signedHash The signed combined hash of the prepared transactions.
     * @param preparedParty The prepared party object from prepareExternalPartyTopology.
     * @param grantUserRights Defines if the transaction should also grant user right to current user (default is true)
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async submitExternalPartyTopology(
        signedHash: string,
        preparedParty: PreparedParty,
        grantUserRights: boolean = true
    ): Promise<AllocatedParty> {
        if (await this.client.checkIfPartyExists(preparedParty.partyId))
            return { partyId: preparedParty.partyId }

        const signedTopologyTxs = preparedParty.partyTransactions.map(
            (transaction) =>
                TopologyWriteService.toSignedTopologyTransaction(
                    preparedParty.txHashes,
                    transaction,
                    signedHash,
                    preparedParty.namespace
                )
        )

        await this.topologyClient.submitExternalPartyTopology(
            signedTopologyTxs,
            preparedParty.partyId
        )

        if (grantUserRights) {
            await this.client.waitForPartyAndGrantUserRights(
                this.userId,
                preparedParty.partyId
            )
        }

        return { partyId: preparedParty.partyId }
    }

    /** Prepares, signs and submits a new external party topology in one step.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     *
     * @deprecated Use LedgerController.signAndAllocateExternalParty instead
     *
     * @param privateKey The private key of the new external party, used to sign the topology transactions.
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @param confirmingThreshold optional parameter for multi-hosted parties (default is 1).
     * @param hostingParticipantPermissions optional participant permission for multi-hosted party.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async prepareSignAndSubmitExternalParty(
        privateKey: PrivateKey,
        partyHint?: string,
        confirmingThreshold?: number,
        hostingParticipantPermissions?: Map<string, Enums_ParticipantPermission>
    ): Promise<AllocatedParty> {
        const preparedParty = await this.prepareExternalPartyTopology(
            getPublicKeyFromPrivate(privateKey),
            partyHint,
            confirmingThreshold,
            hostingParticipantPermissions
        )
        const signedHash = signTransactionHash(
            preparedParty!.combinedHash,
            privateKey
        )

        // grant user rights automatically if the party is hosted on 1 participant
        // if hosted on multiple participants, then we need to authorize each PartyToParticipant mapping
        // before granting the user rights
        const grantUserRights =
            hostingParticipantPermissions === undefined ||
            hostingParticipantPermissions.size === 1

        return await this.submitExternalPartyTopology(
            signedHash,
            preparedParty,
            grantUserRights
        )
    }

    /** Gets a participantId for a specified participant
     * @param participantEndpoints the config to connect to a ledger
     * @returns A participant id
     */
    async getParticipantId(
        participantEndpoints: MultiHostPartyParticipantConfig
    ): Promise<string> {
        const lc = new LedgerClient({
            baseUrl: participantEndpoints.baseUrl,
            logger: this.logger,
            isAdmin: true,
            accessToken: participantEndpoints.accessToken,
            accessTokenProvider: participantEndpoints.accessTokenProvider,
        })

        return (await lc.getWithRetry('/v2/parties/participant-id'))
            .participantId
    }

    /** Prepares, signs and submits a new external party topology in one step.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     *
     * @deprecated Use LedgerController.signAndAllocateExternalParty instead
     *
     * @param participantEndpoints List of endpoints to the respective hosting participant Admin APIs and ledger API.
     * @param privateKey The private key of the new external party, used to sign the topology transactions.
     * @param synchronizerId  ID of the synchronizer on which the party will be registered.
     * @param hostingParticipantPermissions Map of participant id and permission level for participant
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @param confirmingThreshold Minimum number of confirmations that must be received from the confirming participants to authorize a transaction.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async prepareSignAndSubmitMultiHostExternalParty(
        participantEndpoints: MultiHostPartyParticipantConfig[],
        privateKey: string,
        synchronizerId: PartyId,
        hostingParticipantPermissions: Map<string, Enums_ParticipantPermission>,
        partyHint?: string,
        confirmingThreshold?: number
    ): Promise<AllocatedParty> {
        const preparedParty = await this.prepareSignAndSubmitExternalParty(
            getPublicKeyFromPrivate(privateKey),
            partyHint,
            confirmingThreshold,
            hostingParticipantPermissions
        )

        this.logger.info(preparedParty, 'created external party')

        // start after first because we've already onboarded an external party and authorized the mapping
        // on the participant specified in the wallet.sdk.configure
        // now we need to authorize the party to participant transaction on the others
        for (const endpoint of participantEndpoints.slice(1)) {
            const lc = new LedgerClient({
                baseUrl: endpoint.baseUrl,
                logger: this.logger,
                isAdmin: true,
                accessToken: endpoint.accessToken,
                accessTokenProvider: endpoint.accessTokenProvider,
            })

            const service = new TopologyWriteService(
                synchronizerId,
                endpoint.adminApiUrl,
                lc,
                endpoint.accessToken,
                endpoint.accessTokenProvider,
                undefined
            )

            await service.authorizePartyToParticipant(preparedParty.partyId)
        }

        await this.client.waitForPartyAndGrantUserRights(
            this.userId,
            preparedParty.partyId
        )

        return { partyId: preparedParty.partyId }
    }
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTopologyDefault = (
    userId: string,
    accessTokenProvider: AccessTokenProvider,
    synchronizerId: PartyId,
    accessToken: string = ''
): TopologyController =>
    localNetTopologyAppUser(
        userId,
        accessTokenProvider,
        synchronizerId,
        accessToken
    )

export const localNetTopologyAppUser = (
    userId: string,
    accessTokenProvider: AccessTokenProvider,
    synchronizerId: PartyId,
    accessToken: string = ''
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:2902',
        new URL('http://127.0.0.1:2975'),
        userId,
        synchronizerId,
        accessToken,
        accessTokenProvider
    )
}

export const localNetTopologyAppProvider = (
    userId: string,
    accessTokenProvider: AccessTokenProvider,
    synchronizerId: PartyId,
    accessToken: string = ''
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:3902',
        new URL('http://127.0.0.1:3975'),
        userId,
        synchronizerId,
        accessToken,
        accessTokenProvider
    )
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localTopologyDefault = (
    userId: string,
    accessTokenProvider: AccessTokenProvider,
    accessToken: string = ''
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:5012',
        new URL('http://127.0.0.1:5003'),
        userId,
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
        accessToken,
        accessTokenProvider
    )
}
