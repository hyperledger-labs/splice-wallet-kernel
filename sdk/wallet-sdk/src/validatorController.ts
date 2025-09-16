// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import {
    ScanClient,
    ValidatorInternalClient,
} from '@canton-network/core-splice-client'

import {
    getPublicKeyFromPrivate,
    signTransactionHash,
    PrivateKey,
} from '@canton-network/core-signing-lib'
import { PartyId } from '@canton-network/core-types'

/**
 * TokenStandardController handles token standard management tasks.
 * This controller requires a userId and token.
 */
export class ValidatorController {
    private logger = pino({ name: 'ValidatorController', level: 'info' })
    private validatorClient: ValidatorInternalClient
    private userId: string
    private partyId: PartyId | undefined
    private synchronizerId: PartyId | undefined

    /** Creates a new instance of the LedgerController.
     *
     * @param userId is the ID of the user making requests, this is usually defined in the canton config as ledger-api-user.
     * @param baseUrl the url for the ledger api, this is usually defined in the canton config as http-ledger-api.
     * @param accessToken the access token from the user, usually provided by an auth controller.
     */
    constructor(
        userId: string,
        baseUrl: string,
        private accessToken: string
    ) {
        this.validatorClient = new ValidatorInternalClient(
            baseUrl,
            this.logger,
            this.accessToken
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

    /**  Lookup a TransferPreapproval by the receiver party
     * @param scanUrl url to access the scan proxy
     * @param partyId receiver party id
     * @returns A promise that resolves to an array of
     * transfer preapparovals by party.
     */

    async getTransferPreApprovals(scanUrl: string, partyId: PartyId) {
        const scanClient = new ScanClient(
            scanUrl,
            this.logger,
            this.accessToken
        )

        return await scanClient.get(
            '/v0/transfer-preapprovals/by-party/{party}',
            {
                path: {
                    party: partyId,
                },
            }
        )
    }

    /**  Looks up the validator operator party
     */

    async getValidatorUser() {
        const validatorUserResponse =
            await this.validatorClient.get('/v0/validator-user')
        return validatorUserResponse.party_id
    }
}

/**
 * A default factory function used for running against a local validator node.
 * This uses mock-auth and is started with the 'yarn start:canton'
 */
export const localValidatorDefault = (
    userId: string,
    token: string
): ValidatorController => {
    return new ValidatorController(
        userId,
        'http://wallet.localhost:2000/api/validator',
        token
    )
}
