// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LRUCache } from 'typescript-lru-cache'
import { ACSContainer } from './acs-container.js'

export const DEFAULT_MAX_CACHE_SIZE = 100
export const DEFAULT_ENTRY_EXPIRATION_TIME = 10 * 60 * 1000

export const SharedACSCache = new LRUCache<string, ACSContainer>({
    maxSize: DEFAULT_MAX_CACHE_SIZE,
    entryExpirationTimeInMS: DEFAULT_ENTRY_EXPIRATION_TIME,
    onEntryEvicted: (entry) => {
        console.debug(`${entry} has expired`)
        SharedACSCacheStats.evictions++
    },
})

export const SharedACSCacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cacheSize: 0,
    totalLookupTime: 0,
    totalCacheServeTime: 0,
}
