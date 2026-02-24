// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PrepareSubmissionResponse } from '@canton-network/core-ledger-client'
import {
    PrivateKey,
    signTransactionHash,
} from '@canton-network/core-signing-lib'
import { ExecuteFn } from '../ledger/types'
import { SignedTransaction } from './signed'

export class PreparedTransaction {
    constructor(
        public readonly response: PrepareSubmissionResponse,
        private readonly _execute: ExecuteFn
    ) {}

    sign(privateKey: PrivateKey): SignedTransaction {
        const signature = signTransactionHash(
            this.response.preparedTransactionHash,
            privateKey
        )
        return new SignedTransaction(this.response, signature, this._execute) // pass execute function for online signing workflows
    }

    toJson() {
        return { response: this.response }
    }
}
