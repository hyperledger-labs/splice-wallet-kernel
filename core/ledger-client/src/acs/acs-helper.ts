// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '../ledger-client'

import { LRUCache } from 'typescript-lru-cache'
import { ACSContainer, ACSKey } from './acs-container.js'
import {
    DEFAULT_MAX_CACHE_SIZE,
    DEFAULT_ENTRY_EXPIRATION_TIME,
    SharedACSCacheStats,
} from './acs-shared-cache.js'
import { WSSupport } from './ws-support.js'
import { PartyId } from '@canton-network/core-types'
import { Logger } from 'pino'
import { JsGetActiveContractsResponse } from './types.js'

export type AcsHelperOptions = {
    wsSupport?: WSSupport
    maxCacheSize?: number
    entryExpirationTime?: number
    includeCreatedEventBlob?: boolean
}

export class ACSHelper {
    private contractsSet: LRUCache<string, ACSContainer>
    private readonly apiInstance: LedgerClient
    private readonly wsSupport: WSSupport | undefined
    private readonly logger: Logger
    private includeCreatedEventBlob: boolean
    private totalCacheServeTime = 0

    constructor(
        apiInstance: LedgerClient,
        _logger: Logger,
        options?: AcsHelperOptions,
        sharedCache?: LRUCache<string, ACSContainer>
    ) {
        this.contractsSet =
            sharedCache ??
            new LRUCache({
                maxSize: options?.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE,
                entryExpirationTimeInMS:
                    options?.entryExpirationTime ??
                    DEFAULT_ENTRY_EXPIRATION_TIME, // 10 minutes
                onEntryEvicted: (entry) => {
                    this.logger.debug(
                        `entry ${entry.key} isExpired =  ${entry.isExpired}. evicting entry.`
                    )
                    SharedACSCacheStats.evictions++
                },
            })
        this.apiInstance = apiInstance
        this.wsSupport = options?.wsSupport
        this.logger = _logger.child({ component: 'ACSHelper' })
        this.includeCreatedEventBlob = options?.includeCreatedEventBlob ?? true
    }

    getCacheStats() {
        const totalCalls = SharedACSCacheStats.hits + SharedACSCacheStats.misses
        const hitRate = totalCalls
            ? (SharedACSCacheStats.hits / totalCalls) * 100
            : 0
        const avgLookupTime =
            totalCalls > 0
                ? SharedACSCacheStats.totalLookupTime / totalCalls
                : 0

        return {
            totalCalls,
            hits: SharedACSCacheStats.hits,
            misses: SharedACSCacheStats.misses,
            evictions: SharedACSCacheStats.evictions,
            cacheSize: this.contractsSet.size,
            hitRate: hitRate.toFixed(2) + '%',
            averageLookupTime: avgLookupTime.toFixed(3) + ' ms',
            cacheServeTime: this.totalCacheServeTime.toFixed(3),
        }
    }

    private static createKey(
        party?: PartyId,
        templateId?: string,
        interfaceId?: string
    ): ACSKey {
        return { party, templateId, interfaceId }
    }

    private static keyToString(key: ACSKey, ledgerBaseUrl: string): string {
        return `${ledgerBaseUrl}_${key.party ? key.party : 'ANY'}_T:${key.templateId ?? '()'}_I:${key.interfaceId ?? '()'}`
    }

    private findACSContainer(key: ACSKey): ACSContainer {
        const keyStr = ACSHelper.keyToString(key, this.apiInstance.baseUrl.href)
        // this.logger.info(`ACS KEY ${keyStr}`)
        const start = performance.now()
        const existing = this.contractsSet.get(keyStr)
        const end = performance.now()
        SharedACSCacheStats.totalLookupTime += end - start

        if (existing) {
            SharedACSCacheStats.hits++
            this.logger.debug('cache hit')
            return existing
        }

        this.logger.debug('cache miss')
        SharedACSCacheStats.misses++
        const newContainer = new ACSContainer(undefined, {
            includeCreatedEventBlob: this.includeCreatedEventBlob,
        })

        this.contractsSet.set(keyStr, newContainer)
        return newContainer
    }

    async activeContractsForTemplate(
        offset: number,
        partyFilter: string,
        templateId: string
    ): Promise<Array<JsGetActiveContractsResponse>> {
        const key = ACSHelper.createKey(partyFilter, templateId, undefined)
        const start = performance.now()
        const container = this.findACSContainer(key)
        const result = container.update(
            offset,
            key,
            this.apiInstance,
            this.wsSupport
        )
        const end = performance.now()

        if (
            this.contractsSet.has(
                ACSHelper.keyToString(key, this.apiInstance.baseUrl.href)
            )
        ) {
            SharedACSCacheStats.totalCacheServeTime += end - start
        }

        return result
    }

    async activeContractsForInterface(
        offset: number,
        partyFilter: string | undefined,
        interfaceId: string
    ): Promise<Array<JsGetActiveContractsResponse>> {
        const key = ACSHelper.createKey(partyFilter, undefined, interfaceId)
        const start = performance.now()
        const container = this.findACSContainer(key)

        const result = container.update(
            offset,
            key,
            this.apiInstance,
            this.wsSupport
        )

        const end = performance.now()

        if (
            this.contractsSet.has(
                ACSHelper.keyToString(key, this.apiInstance.baseUrl.href)
            )
        ) {
            SharedACSCacheStats.totalCacheServeTime += end - start
        }

        return result
    }
}
