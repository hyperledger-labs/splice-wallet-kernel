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
    useLocalStorage?: boolean
    wsSupport?: WSSupport
    maxCacheSize?: number
    entryExpirationTime?: number
}

export class ACSHelper {
    private contractsSet: LRUCache<string, ACSContainer>
    private readonly apiInstance: LedgerClient
    private readonly wsSupport: WSSupport | undefined
    private readonly logger: Logger
    private useLocalStorage: boolean
    private hits = 0
    private misses = 0

    constructor(
        apiInstance: LedgerClient,
        _logger: Logger,
        options: AcsHelperOptions = {
            useLocalStorage: false,
        }
    ) {
        this.useLocalStorage = options.useLocalStorage ?? false
        this.contractsSet = new LRUCache({
            maxSize: options.maxCacheSize ?? 50,
            entryExpirationTimeInMS:
                options.entryExpirationTime ?? 10 * 60 * 1000, // 10 minutes
            onEntryEvicted: (entry) => {
                if (!this.useLocalStorage) {
                    return
                }
                this.logger.debug(
                    `Storing ACSContainer (cache) for key  ${entry.key}`
                )
                try {
                    localStorage.setItem(entry.key, JSON.stringify(entry.value))
                } catch (e) {
                    if (e instanceof DOMException) {
                        this.logger.debug(
                            `Failed to store ACSContainer (cache) for key  ${entry.key} in localStorage: ${e.message}`
                        ) // possibly quota exceeded
                    } else {
                        this.logger.error(e)
                    }
                }
            },
        })
        this.apiInstance = apiInstance
        this.wsSupport = options.wsSupport
        this.logger = _logger.child({ component: 'ACSHelper' })
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
        const existing = this.contractsSet.get(keyStr)

        if (existing) {
            this.hits++
            this.logger.info('cache hit')
            return existing
        }
        if (this.useLocalStorage) {
            const persistedData = localStorage.getItem(keyStr)
            if (persistedData) {
                try {
                    const parsed = JSON.parse(persistedData) as ACSContainer
                    const restored = new ACSContainer(parsed)
                    this.contractsSet.set(keyStr, restored)
                    this.logger.debug(
                        `Restored ACSContainer (cache) for key  ${keyStr} from localStorage`
                    )
                    return restored
                } catch (e) {
                    if (e instanceof DOMException) {
                        this.logger.debug(
                            `Failed to restore ACSContainer (cache) for key  ${keyStr} from localStorage: ${e.message}`
                        )
                    } else {
                        throw e
                    }
                }
            }
        }

        this.logger.info('cache miss')
        this.misses++
        const newContainer = new ACSContainer()

        this.contractsSet.set(keyStr, newContainer)
        return newContainer
    }

    async activeContractsForTemplate(
        offset: number,
        partyFilter: string,
        templateId: string
    ): Promise<Array<JsGetActiveContractsResponse>> {
        const key = ACSHelper.createKey(partyFilter, templateId, undefined)
        const container = this.findACSContainer(key)
        return container.update(offset, key, this.apiInstance, this.wsSupport)
    }

    async activeContractsForInterface(
        offset: number,
        partyFilter: string | undefined,
        interfaceId: string
    ): Promise<Array<JsGetActiveContractsResponse>> {
        const key = ACSHelper.createKey(partyFilter, undefined, interfaceId)

        const container = this.findACSContainer(key)

        try {
            return container.update(
                offset,
                key,
                this.apiInstance,
                this.wsSupport
            )
        } catch (e) {
            this.logger.error(e, `updating container failed with`)
            throw e
        }
    }
}
