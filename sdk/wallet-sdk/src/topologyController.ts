// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Enums_ParticipantPermission,
    LedgerClient,
    PreparedTransaction,
    SigningPublicKey,
    TopologyWriteService,
} from '@canton-network/core-ledger-client'
import {
    createKeyPair,
    getPublicKeyFromPrivate,
    signTransactionHash,
    KeyPair,
    PrivateKey,
    PublicKey,
} from '@canton-network/core-signing-lib'
import { pino } from 'pino'
import { hashPreparedTransaction } from '@canton-network/core-tx-visualizer'
import { PartyId } from '@canton-network/core-types'
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
    accessToken: string
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
        userAdminToken: string,
        synchronizerId: PartyId
    ) {
        this.client = new LedgerClient(baseUrl, userAdminToken, this.logger)
        this.userId = userId
        this.topologyClient = new TopologyWriteService(
            synchronizerId,
            adminApiUrl,
            userAdminToken,
            this.client
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
     * @param publicKey
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
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

        const result = {
            partyTransactions,
            combinedHash,
            txHashes,
            namespace,
            partyId,
        }

        return Promise.resolve(result)
    }

    /** Submits a prepared and signed external party topology to the ledger.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param signedHash The signed combined hash of the prepared transactions.
     * @param preparedParty The prepared party object from prepareExternalPartyTopology.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async submitExternalPartyTopology(
        signedHash: string,
        preparedParty: PreparedParty,
        grantUserRights: boolean = true
    ): Promise<AllocatedParty> {
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
            await this.client.grantUserRights(
                this.userId,
                preparedParty.partyId
            )
        }

        return { partyId: preparedParty.partyId }
    }

    /** Prepares, signs and submits a new external party topology in one step.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param privateKey The private key of the new external party, used to sign the topology transactions.
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
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
        const lc = new LedgerClient(
            participantEndpoints.baseUrl,
            participantEndpoints.accessToken,
            this.logger
        )

        return (await lc.get('/v2/parties/participant-id')).participantId
    }

    /** Prepares, signs and submits a new external party topology in one step.
     * This will also authorize the new party to the participant and grant the user rights to the party.
     * @param participant_endpoints List of endpoints to the respective hosting participant Admin APIs and ledger API.
     * @param privateKey The private key of the new external party, used to sign the topology transactions.
     * @param synchronizer_id  ID of the synchronizer on which the party will be registered.
     * @param hostingParticipantPermissions Map of participant id and permission level for participant
     * @param partyHint Optional hint to use for the partyId, if not provided the publicKey will be used.
     * @param confirming_threshold Minimum number of confirmations that must be received from the confirming participants to authorize a transaction.
     * @returns An AllocatedParty object containing the partyId of the new party.
     */
    async prepareSignAndSubmitMultiHostExternalParty(
        participantEndpoints: MultiHostPartyParticipantConfig[],
        privateKey: string,
        synchronizerId: string,
        hostingParticipantPermissions: Map<string, Enums_ParticipantPermission>,
        partyHint?: string,
        confirmingThreshold?: number
    ) {
        const preparedParty = await this.prepareSignAndSubmitExternalParty(
            privateKey,
            partyHint,
            confirmingThreshold,
            hostingParticipantPermissions
        )

        this.logger.info(preparedParty, 'created external party')
        //start after first because we've already onboarded an external party and authorized the mapping
        // on the participant specified in the wallet.sdk.configure
        // now we need to authorize the party to participant transaction on the others

        for (const endpoint of participantEndpoints.slice(1)) {
            const lc = new LedgerClient(
                endpoint.baseUrl,
                endpoint.accessToken,
                this.logger
            )

            const service = new TopologyWriteService(
                synchronizerId,
                endpoint.adminApiUrl,
                endpoint.accessToken,
                lc
            )

            await service.authorizePartyToParticipant(preparedParty.partyId)
        }

        // the PartyToParticipant mapping needs to be authorized on each HostingParticipant
        // before we can grantUserRights to the party

        await this.client.grantUserRights(this.userId, preparedParty.partyId)

        return { partyId: preparedParty.partyId }
    }
}

/**
 * A default factory function used for running against a local net initialized via docker.
 * This uses unsafe-auth and is started with the 'yarn start:localnet' or docker compose from localNet setup.
 */
export const localNetTopologyDefault = (
    userId: string,
    userAdminToken: string,
    synchronizerId: PartyId
): TopologyController =>
    localNetTopologyAppUser(userId, userAdminToken, synchronizerId)

export const localNetTopologyAppUser = (
    userId: string,
    userAdminToken: string,
    synchronizerId: PartyId
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:2902',
        new URL('http://127.0.0.1:2975'),
        userId,
        userAdminToken,
        synchronizerId
    )
}

export const localNetTopologyAppProvider = (
    userId: string,
    userAdminToken: string,
    synchronizerId: PartyId
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:3902',
        new URL('http://127.0.0.1:3975'),
        userId,
        userAdminToken,
        synchronizerId
    )
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localTopologyDefault = (
    userId: string,
    userAdminToken: string
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:5012',
        new URL('http://127.0.0.1:5003'),
        userId,
        userAdminToken,
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd'
    )
}
