// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PreparedTransaction } from '@canton-network/core-ledger-proto'
import { SDKContext } from '../../../sdk.js'
import { SDKUtilsNamespace } from '../../utils/index.js'

export class PreparedTransactionNamespace {
    private readonly utils: SDKUtilsNamespace
    constructor(private readonly ctx: SDKContext) {
        this.utils = new SDKUtilsNamespace({
            error: ctx.error,
            logger: ctx.logger,
        })
    }

    /**
     * @deprecated use sdk.utils.hash.preparedTransacation
     */
    public async hash(value: PreparedTransaction | string) {
        return await this.utils.hash.preparedTransacation(value)
    }
}
