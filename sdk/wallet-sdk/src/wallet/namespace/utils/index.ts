// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PingService } from './ping/index.js'

export class SDKUtilsNamespace {
    public readonly ping: PingService
    constructor() {
        this.ping = new PingService()
    }
}
