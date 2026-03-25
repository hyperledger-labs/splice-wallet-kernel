// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { MinimalContext } from '../sdk.js'
import { Ping } from './ping/index.js'

export class SdkUtils {
    public readonly ping: Ping
    constructor(private readonly ctx: MinimalContext) {
        this.ping = new Ping(ctx)
    }
}
