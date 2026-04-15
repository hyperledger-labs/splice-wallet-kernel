// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../sdk.js'
import { PingService } from './ping/index.js'

export class SDKUtilsNamespace {
    public readonly ping: PingService
    constructor(private readonly ctx: SDKContext) {
        this.ping = new PingService(ctx)
    }
}
