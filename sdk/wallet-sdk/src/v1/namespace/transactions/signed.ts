// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PrepareSubmissionResponse } from '@canton-network/core-ledger-client'
import { ExecuteOptions, ExecuteFn } from '../ledger/types'
import { WalletSdkContext } from 'src/v1/sdk'

export class SignedTransaction {
    constructor(
        private readonly ctx: WalletSdkContext,
        public readonly response: PrepareSubmissionResponse,
        public readonly signature: string,
        private readonly _execute?: ExecuteFn //optional in case of offline signing
    ) {}

    /**
     *  For offline signing workflows, construct from externally produced signature
     */
    static fromSignature(
        ctx: WalletSdkContext,
        response: PrepareSubmissionResponse,
        signature: string
    ): SignedTransaction {
        return new SignedTransaction(ctx, response, signature)
    }

    execute(options: ExecuteOptions) {
        if (!this._execute) {
            this.ctx.error.throw({
                message:
                    'Cannot call execute() on a SignedTransaction offline. Used sdk.ledger.execute(signed, options) instead.',
                type: 'SDKOperationUnsupported',
            })
        }
        return this._execute(this, options)
    }
}
