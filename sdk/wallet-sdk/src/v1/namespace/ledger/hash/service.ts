// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PreparedTransaction } from '@canton-network/core-ledger-proto'
import { WalletSdkContext } from '../../../sdk.js'
import { PreparedTransactionEncoder } from './util/encoder/preparedTransactionEncoder.js'

export class PreparedTransactionService {
    private readonly encodePreparedTransaction: PreparedTransactionEncoder
    constructor(private readonly ctx: WalletSdkContext) {
        this.encodePreparedTransaction = new PreparedTransactionEncoder(ctx)
    }

    public async hash(value: PreparedTransaction | string) {
        return await this.encodePreparedTransaction.hash(value)
    }
}
