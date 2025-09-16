// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
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

export type ParticipantEndpointConfig = {
    adminApiUrl: string
    baseUrl: string
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
        participantIds?: string[]
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
                participantIds
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
        multiHost: boolean = false
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

        this.logger.info('submitting external party topology')
        await this.topologyClient.submitExternalPartyTopology(
            signedTopologyTxs,
            preparedParty.partyId
        )

        if (!multiHost) {
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
        participantIds?: string[]
    ): Promise<AllocatedParty> {
        const preparedParty = await this.prepareExternalPartyTopology(
            getPublicKeyFromPrivate(privateKey),
            partyHint,
            confirmingThreshold,
            participantIds
        )

        const signedHash = signTransactionHash(
            preparedParty!.combinedHash,
            privateKey
        )

        const multiHost = participantIds && participantIds?.length > 0

        return await this.submitExternalPartyTopology(
            signedHash,
            preparedParty,
            multiHost
        )
    }

    async getParticipantId(
        participantEndpoints: ParticipantEndpointConfig
    ): Promise<string> {
        const lc = new LedgerClient(
            participantEndpoints.baseUrl,
            participantEndpoints.accessToken,
            this.logger
        )

        return (await lc.get('/v2/parties/participant-id')).participantId
    }

    async multiHostParty(
        participantEndpoints: ParticipantEndpointConfig[],
        privateKey: string,
        synchronizerId: string,
        partyHint?: string,
        confirmingThreshold?: number
    ) {
        this.logger.info('getting participant ids')
        const participantIdPromises = participantEndpoints.map(
            async (endpoint) => {
                return await this.getParticipantId(endpoint)
            }
        )

        const participantIds = await Promise.all(participantIdPromises)

        // const preparedParty = await this.prepareExternalPartyTopology(
        //     getPublicKeyFromPrivate(privateKey),
        //     partyHint,
        //     confirmingThreshold,
        //     participantIds
        // )

        // this.logger.info(preparedParty, 'preparedTxResponse')

        // const base64StringCombinedHash = Buffer.from(
        //     preparedParty?.combinedHash,
        //     'hex'
        // ).toString('base64')

        // const signedHash = signTransactionHash(
        //     base64StringCombinedHash,
        //     privateKey
        // )

        // this.logger.info(signedHash)

        // const submit = await this.submitExternalPartyTopology(
        //     signedHash,
        //     preparedParty,
        //     true
        // )

        const preparedParty = await this.prepareSignAndSubmitExternalParty(
            privateKey,
            'bob',
            confirmingThreshold,
            participantIds
        )

        this.logger.info(preparedParty, 'onboarded external party')

        //start after first because we've already onboarded an external party the normal way
        //now we need to authorize the party to participant requests on the others
        for (let i = 1; i < participantEndpoints.length; i++) {
            const lc = new LedgerClient(
                participantEndpoints[i].baseUrl,
                participantEndpoints[i].accessToken,
                this.logger
            )
            const service = new TopologyWriteService(
                synchronizerId,
                participantEndpoints[i].adminApiUrl,
                participantEndpoints[i].accessToken,
                lc
            )
            this.logger.info(participantEndpoints[i], 'endpoint info')

            await service.authorizePartyToParticipant(preparedParty.partyId)
        }

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
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:2902',
        new URL('http://127.0.0.1:2975'),
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
