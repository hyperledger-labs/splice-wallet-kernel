// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import {
    PrivateKey,
    signTransactionHash,
} from '@canton-network/core-signing-lib'
import { WalletSdkContext } from '../../sdk.js'
import { SignedPartyCreation } from './signed.js'
import { CreatePartyOptions } from './types.js'

/**
 * Represents a prepared (but unsigned) party creation transaction.
 * The actual topology transaction is generated asynchronously but not yet signed.
 */
export class PreparedPartyCreation {
    constructor(
        private readonly ctx: WalletSdkContext,
        private readonly partyCreationPromise: Promise<GenerateTransactionResponse>,
        private readonly createPartyOptions?: CreatePartyOptions
    ) {}

    /**
     * Signs the prepared party creation with the private key.
     * @param privateKey - The private key used to sign the topology transaction
     * @returns SignedPartyCreation builder for chaining execute()
     */
    public sign(privateKey: PrivateKey) {
        const signedPartyPromise = this.partyCreationPromise.then(
            (transactionResponse) => ({
                party: transactionResponse,
                signature: signTransactionHash(
                    transactionResponse.multiHash,
                    privateKey
                ),
            })
        )
        this.ctx.logger.info('Signed party successfully.')
        return new SignedPartyCreation(
            this.ctx,
            signedPartyPromise,
            this.createPartyOptions
        )
    }

    /**
     * Executes party creation using a pre-computed signature (for offline signing workflows).
     * @param signature - The cryptographic signature for the party creation transaction
     * @param options - Optional execution flags (expectHeavyLoad for timeout handling, grantUserRights to add user permissions)
     * @returns The confirmed GenerateTransactionResponse containing party details
     */
    public async execute(
        signature: string,
        options?: Parameters<SignedPartyCreation['execute']>[0]
    ) {
        const signedPartyPromise = this.partyCreationPromise.then((party) => ({
            party,
            signature,
        }))

        const signedParty = new SignedPartyCreation(
            this.ctx,
            signedPartyPromise,
            this.createPartyOptions
        )

        return await signedParty.execute(options)
    }

    public async getParty() {
        return await this.partyCreationPromise
    }
}
