// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { CommonCtx } from '../sdk.js'
import { PingService } from './ping/index.js'

export class SdkUtilsNamespace {
    public readonly ping: PingService
    constructor(private readonly ctx: CommonCtx) {
        this.ping = new PingService(ctx)
    }
}
