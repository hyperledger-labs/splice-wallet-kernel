// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PrepareSubmissionResponse } from '@canton-network/core-ledger-client'
import { ExecuteOptions, ExecuteFn } from '../ledger/types.js'

export class SignedTransaction {
    constructor(
        public readonly response: PrepareSubmissionResponse,
        public readonly signature: string,
        private readonly _execute?: ExecuteFn //optional in case of offline signing
    ) {}

    /**
     *  For offline signing workflows, construct from externally produced signature
     */
    static fromSignature(
        response: PrepareSubmissionResponse,
        signature: string
    ): SignedTransaction {
        return new SignedTransaction(response, signature)
    }

    execute(options: ExecuteOptions) {
        if (!this._execute) {
            throw new Error(
                'Cannot call execute() on a SignedTransaction offline. Used sdk.ledger.execute(signed, options) instead.'
            )
        }
        return this._execute(this, options)
    }
}
