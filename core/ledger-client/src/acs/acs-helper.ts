// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '../ledger-client'

import { LRUCache } from 'typescript-lru-cache'
import { ACSContainer, ACSKey } from './acs-container.js'
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

const DEFAULT_MAX_CACHE_SIZE = 50
const DEFAULT_ENTRY_EXPIRATION_TIME = 10 * 60 * 1000

export class ACSHelper {
    private contractsSet: LRUCache<string, ACSContainer>
    private readonly apiInstance: LedgerClient
    private readonly wsSupport: WSSupport | undefined
    private readonly logger: Logger
    private includeCreatedEventBlob: boolean
    private hits = 0
    private misses = 0
    private evictions = 0
    private totalLookuptime = 0
    private totalCacheServeTime = 0

    constructor(
        apiInstance: LedgerClient,
        _logger: Logger,
        options?: AcsHelperOptions
    ) {
        this.contractsSet = new LRUCache({
            maxSize: options?.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE,
            entryExpirationTimeInMS:
                options?.entryExpirationTime ?? DEFAULT_ENTRY_EXPIRATION_TIME, // 10 minutes
            onEntryEvicted: (entry) => {
                this.logger.debug(
                    `entry ${entry.key} isExpired =  ${entry.isExpired}. evicting entry.`
                )
                this.evictions++
            },
        })
        this.apiInstance = apiInstance
        this.wsSupport = options?.wsSupport
        this.logger = _logger.child({ component: 'ACSHelper' })
        this.includeCreatedEventBlob = options?.includeCreatedEventBlob ?? true
    }

    getCacheStats() {
        const totalCalls = this.hits + this.misses
        const hitRate = totalCalls ? (this.hits / totalCalls) * 100 : 0
        const avgLookupTime =
            totalCalls > 0 ? this.totalLookuptime / totalCalls : 0

        return {
            totalCalls,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
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

    private static keyToString(key: ACSKey): string {
        return `${key.party ? key.party : 'ANY'}_T:${key.templateId ?? '()'}_I:${key.interfaceId ?? '()'}`
    }

    private findACSContainer(key: ACSKey): ACSContainer {
        const keyStr = ACSHelper.keyToString(key)
        const start = performance.now()
        const existing = this.contractsSet.get(keyStr)
        const end = performance.now()
        this.totalLookuptime += end - start

        if (existing) {
            this.hits++
            this.logger.debug('cache hit')
            return existing
        }

        this.logger.debug('cache miss')
        this.misses++
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

        if (this.contractsSet.has(ACSHelper.keyToString(key))) {
            this.totalCacheServeTime += end - start
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

        if (this.contractsSet.has(ACSHelper.keyToString(key))) {
            this.totalCacheServeTime += end - start
        }

        return result
    }
}
