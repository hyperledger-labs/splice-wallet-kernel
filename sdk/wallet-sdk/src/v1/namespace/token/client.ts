// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../../sdk.js'
import { AllocationService } from './allocation/index.js'
import { UtxoService } from './utxos/index.js'
import { TransferService } from './transfer/index.js'

export class Token {
    public readonly allocation: AllocationService
    public readonly transfer: TransferService
    public readonly utxos: UtxoService
    constructor(private readonly sdkContext: WalletSdkContext) {
        this.allocation = new AllocationService(sdkContext)
        this.transfer = new TransferService(sdkContext)
        this.utxos = new UtxoService(sdkContext, this.transfer)
    }
}
