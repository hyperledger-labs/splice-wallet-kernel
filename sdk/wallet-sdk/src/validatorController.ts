// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import {
    ScanProxyClient,
    ValidatorInternalClient,
} from '@canton-network/core-splice-client'

import {
    getPublicKeyFromPrivate,
    signTransactionHash,
    PrivateKey,
} from '@canton-network/core-signing-lib'
import { AccessTokenProvider, PartyId } from '@canton-network/core-types'

/**
 * TokenStandardController handles token standard management tasks.
 * This controller requires a userId and token.
 */
export class ValidatorController {
    private logger = pino({ name: 'ValidatorController', level: 'info' })
    private validatorClient: ValidatorInternalClient
    private scanProxyClient: ScanProxyClient
    private userId: string
    private partyId: PartyId | undefined
    private synchronizerId: PartyId | undefined
    private readonly accessTokenProvider: AccessTokenProvider

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param accessTokenProvider provider for caching access tokens used to authenticate requests.
     * @param isAdmin optional flag to set true when creating adminLedger.
     * @param accessToken the access token from the user, usually provided by an auth controller. This parameter will be removed with version 1.0.0, please use accessTokenProvider instead)
     */
    constructor(
        userId: string,
        baseUrl: URL,
        accessTokenProvider: AccessTokenProvider,
        isAdmin: boolean = false,
        accessToken: string = ''
    ) {
        this.accessTokenProvider = accessTokenProvider
        this.validatorClient = new ValidatorInternalClient(
            baseUrl,
            this.logger,
            isAdmin,
            accessToken,
            this.accessTokenProvider
        )

        this.scanProxyClient = new ScanProxyClient(
            baseUrl,
            this.logger,
            isAdmin,
            accessToken,
            this.accessTokenProvider
        )
        this.userId = userId
        return this
    }

    /**
     * Sets the party that the ValidatorController will use for requests.
     * @param partyId
     */
    setPartyId(partyId: PartyId): ValidatorController {
        this.partyId = partyId
        return this
    }

    /**
     * Sets the synchronizerId that the ValidatorController will use for requests.
     * @param synchronizerId
     */
    setSynchronizerId(synchronizerId: PartyId): ValidatorController {
        this.synchronizerId = synchronizerId
        return this
    }

    /**
     *  Gets the party Id or throws an error if it has not been set yet
     *  @returns partyId
     */
    getPartyId(): PartyId {
        if (!this.partyId)
            throw new Error('PartyId is not defined, call setPartyId')
        else return this.partyId
    }

    /**
     *  Gets the synchronizer Id or throws an error if it has not been set yet
     *  @returns partyId
     */
    getSynchronizerId(): PartyId {
        if (!this.synchronizerId)
            throw new Error(
                'synchronizer Id is not defined, call setSynchronizerId'
            )
        else return this.synchronizerId
    }

    /**
     * @deprecated
     * Use the ledgerController.createTransferPreapprovalCommand() and ledgerController.prepareSignAndExecuteTransaction() instead
     * Create the ExternalPartySetupProposal contract as the validator operator
     * @param partyId
     * returns contractId used in prepareExternalPartyProposal
     */
    async createExternalPartyProposal(partyId: PartyId) {
        return await this.validatorClient.post(
            '/v0/admin/external-party/setup-proposal',
            {
                user_party_id: partyId,
            }
        )
    }

    /**
     * @deprecated
     * Use the ledgerController.createTransferPreapprovalCommand() and ledgerController.prepareSignAndExecuteTransaction() instead
     * Given a contract id of an ExternalPartySetupProposal, prepare the transaction
     * to accept it such that it can be signed externally
     * @param contractId contract id of an ExternalPartySetupProposal
     */
    async prepareExternalPartyProposal(contractId: string) {
        return await this.validatorClient.post(
            '/v0/admin/external-party/setup-proposal/prepare-accept',
            {
                contract_id: contractId,
                user_party_id: this.getPartyId(),
            }
        )
    }

    /**
     * @deprecated
     * Use the ledgerController.createTransferPreapprovalCommand() and ledgerController.prepareSignAndExecuteTransaction() instead
     * Submit a transaction prepared using prepareExternalPartyProposal
     * together with its signature
     * @param publicKey hex-encoded public key
     * @param signedHash hex-encoded signed hash from prepareExternalPartyProposal
     * @param tx hex-encoded transaction from prepareExternalPartyProposal
     */

    async submitPartyProposal(
        publicKey: string,
        signedHash: string,
        tx: string
    ) {
        return await this.validatorClient.post(
            '/v0/admin/external-party/setup-proposal/submit-accept',
            {
                submission: {
                    party_id: this.getPartyId(),
                    transaction: tx,
                    signed_tx_hash: signedHash,
                    public_key: publicKey,
                },
            }
        )
    }

    /**
     * @deprecated Use the ledgerController.createTransferPreapprovalCommand() and ledgerController.prepareSignAndExecuteTransaction() instead
     * Creates an ExternalpartySetupProposal contract as validator operator
     * Prepares and submits the transaction so that the party can
     * Auto accept transfers
     * @param privateKey base64 encoded private key
     */

    async externalPartyPreApprovalSetup(privateKey: PrivateKey) {
        const createPartyProposalResponse =
            await this.createExternalPartyProposal(this.getPartyId())

        const preparedTxAndHash = await this.prepareExternalPartyProposal(
            createPartyProposalResponse.contract_id
        )

        const signedHash = signTransactionHash(
            Buffer.from(preparedTxAndHash.tx_hash, 'hex').toString('base64'),
            privateKey
        )

        await this.submitPartyProposal(
            Buffer.from(getPublicKeyFromPrivate(privateKey), 'base64').toString(
                'hex'
            ),
            Buffer.from(signedHash, 'base64').toString('hex'),
            preparedTxAndHash.transaction
        )
    }

    /**  Looks up the validator operator party
     */

    async getValidatorUser() {
        const validatorUserResponse =
            await this.validatorClient.get('/v0/validator-user')
        return validatorUserResponse.party_id
    }

    /**  Lookup a TransferPreapproval by the receiver party
     * @param receiverId receiver party id
     * @param dsoParty the instrument partyId that has transfer preapproval
     * @returns A promise that returns a boolean of whether an instrument can be transferred directly to the receiver
     */
    async getTransferPreApprovalByParty(receiverId: PartyId) {
        try {
            const { transfer_preapproval } = await this.scanProxyClient.get(
                '/v0/scan-proxy/transfer-preapprovals/by-party/{party}',
                {
                    path: {
                        party: receiverId,
                    },
                }
            )

            const { dso, expiresAt } = transfer_preapproval.contract.payload
            return {
                receiverId,
                expiresAt,
                dso,
            }
        } catch (e) {
            this.logger.error(e)
            throw new Error(
                `failed to get transfer preapproval for receiverId: ${receiverId} `
            )
        }
    }

    /**  Fetch open mining rounds from Scan Proxy API
     * @returns A promise that resolves to an array of
     * open mining rounds contracts
     */

    async getOpenMiningRounds() {
        return this.scanProxyClient.getOpenMiningRounds()
    }

    /**  Fetch Amulet rules from Scan Proxy API
     * @returns A promise that resolves to an
     * amulet rules contract
     */

    async getAmuletRules() {
        return this.scanProxyClient.getAmuletRules()
    }
}

/**
 * A default factory function used for running against a local validator node.
 * This uses the user validator and is started with 'yarn start:localnet`
 */
export const localValidatorDefault = (
    userId: string,
    accessTokenProvider: AccessTokenProvider,
    isAdmin: boolean = false,
    accessToken: string = ''
): ValidatorController => {
    return new ValidatorController(
        userId,
        new URL('http://wallet.localhost:2000/api/validator'),
        accessTokenProvider,
        isAdmin,
        accessToken
    )
}

/**
 * A default factory function used for running against a local validator node.
 * This uses the app provider validator and is started with 'yarn start:localnet`
 */
export const localValidatorDefaultAppProvider = (
    userId: string,
    accessTokenProvider: AccessTokenProvider,
    isAdmin: boolean = false,
    accessToken: string = ''
): ValidatorController => {
    return new ValidatorController(
        userId,
        new URL('http://wallet.localhost:3000/api/validator'),
        accessTokenProvider,
        isAdmin,
        accessToken
    )
}
