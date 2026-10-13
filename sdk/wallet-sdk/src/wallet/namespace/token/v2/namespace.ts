// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenNamespaceConfig } from '../namespace.js'
import { AllocationNamespace } from './allocation/namespace.js'
import { TransferNamespace } from './transfer/namespace.js'

export class TokenV2Namespace {
    public readonly transfer: TransferNamespace
    public readonly allocation: AllocationNamespace

    constructor(ctx: TokenNamespaceConfig) {
        this.transfer = new TransferNamespace(ctx)
        this.allocation = new AllocationNamespace(ctx)
    }
}
