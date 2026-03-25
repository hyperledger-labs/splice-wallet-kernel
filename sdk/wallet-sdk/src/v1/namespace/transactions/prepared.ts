// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    PrivateKey,
    signTransactionHash,
} from '@canton-network/core-signing-lib'
import { SignedTransaction } from './signed.js'
import { WalletSdkContext } from '../../sdk.js'
import { Ledger } from '../ledger/client.js'
import { Ops } from '@canton-network/core-provider-ledger'

export class PreparedTransaction {
    constructor(
        private readonly ctx: WalletSdkContext,
        private readonly preparedPromise: Promise<
            Ops.PostV2InteractiveSubmissionPrepare['ledgerApi']['result']
        >,
        private readonly _execute: Ledger['execute']
    ) {}

    sign(privateKey: PrivateKey): SignedTransaction {
        const signedPromise = this.preparedPromise.then((response) => ({
            response,
            signature: signTransactionHash(
                response.preparedTransactionHash,
                privateKey
            ),
        }))
        return new SignedTransaction(this.ctx, signedPromise, this._execute) // pass execute function for online signing workflows
    }

    async toJSON() {
        return { response: await this.preparedPromise }
    }
}
