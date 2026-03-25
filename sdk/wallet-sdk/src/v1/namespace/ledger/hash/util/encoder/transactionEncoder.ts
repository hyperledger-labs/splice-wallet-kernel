// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from 'src/v1/sdk'
import { Encoder } from './encoder'

export class TransactionEncoder extends Encoder {
    constructor(protected readonly ctx: WalletSdkContext) {
        super(ctx)
    }
}
