// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../../../sdk.js'
import { ACSCacheNamespace } from './cache.js'
import { ACSReader } from './reader.js'

export class ACSNamespace extends ACSReader {
    private readonly cache: ACSCacheNamespace
    constructor(protected readonly sdkContext: SDKContext) {
        super(sdkContext)
        this.cache = new ACSCacheNamespace(sdkContext)
    }
}
