// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { TokenNamespaceConfig } from '../namespace.js'
import { TransferNamespace } from './transfer/namespace.js'

export class TokenV2Namespace {
    public readonly transfer: TransferNamespace

    constructor(ctx: TokenNamespaceConfig) {
        this.transfer = new TransferNamespace(ctx)
    }
}
