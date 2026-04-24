// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKContext } from '../../../sdk.js'
import { ACSCacheNamespace } from './cache.js'
import { ACSReader } from './reader.js'
import { ACSKey } from './types.js'

export class ACSNamespace extends ACSReader {
    private readonly cache: ACSCacheNamespace
    constructor(protected readonly sdkContext: SDKContext) {
        super(sdkContext)
        this.cache = new ACSCacheNamespace(sdkContext)
    }

    public async updateKey(args: { offset: number; key: ACSKey }) {
        await this.cache.update(args)
        return await this.cache.calculateAt(args.offset)
    }

    public async query(offset: number, keys: ACSKey[]) {
        return (
            await Promise.all(
                keys.map(async (key) => await this.updateKey({ offset, key }))
            )
        ).flat()
    }
}
