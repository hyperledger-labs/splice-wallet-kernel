// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LRUCache, LRUCacheOptions } from 'typescript-lru-cache'
import { LedgerTypes, SDKContext } from '../../../sdk.js'
import { ACSCacheNamespace } from './cache.js'
import { ACSReader } from './reader.js'
import { ACSKey } from './types.js'
import { AcsRequestOptions } from '../index.js'
import { AcsOptions } from '@canton-network/core-acs-reader'

export type ACSNamespaceOptions = Pick<
    LRUCacheOptions<string, ACSCacheNamespace>,
    'maxSize' | 'entryExpirationTimeInMS'
>

export class ACSNamespace extends ACSReader {
    private readonly caches: LRUCache<string, ACSCacheNamespace>

    constructor(
        protected readonly sdkContext: SDKContext,
        private readonly options: ACSNamespaceOptions = {
            maxSize: 100,
            entryExpirationTimeInMS: 10 * 60 * 1000,
        }
    ) {
        super(sdkContext)
        this.caches = new LRUCache(options)
    }

    /**
     * Reads the active contract set from the ledger with caching.
     * Resolves party references and constructs cache keys from the provided template and interface IDs.
     * Queries are deduplicated and cached per party-template-interface combination.
     *
     * @override
     * @see {@link ACSReader.readRaw}
     */
    public override async readRaw(
        options: AcsRequestOptions
    ): Promise<Array<LedgerTypes['JsGetActiveContractsResponse']>> {
        const resolvedOptions = await this.resolveAcsOptions(options)
        const { parties, interfaceIds, templateIds } = resolvedOptions
        const keys: ACSKey[] =
            parties?.flatMap((party) => {
                const withTemplateIds =
                    templateIds?.map((templateId) => ({ party, templateId })) ??
                    []
                const withInterfaceIds =
                    interfaceIds?.map((interfaceId) => ({
                        party,
                        interfaceId,
                    })) ?? []
                return [...withInterfaceIds, ...withTemplateIds]
            }) ?? []

        return await this.query({ options: resolvedOptions, keys })
    }

    private getCache(key: ACSKey) {
        const serializedKey = this.serializeKey(key)
        const existingCache = this.caches.get(serializedKey)
        if (existingCache) return existingCache

        const newCache = new ACSCacheNamespace(this.sdkContext)
        this.caches.set(serializedKey, newCache)

        return newCache
    }

    /**
     * Updates the cached active contract set for a specific key and returns contracts at the requested offset.
     * If the cache is outdated, fetches updates from the ledger and applies them incrementally.
     */
    private async updateCache(args: { options: AcsOptions; key: ACSKey }) {
        const cache = this.getCache(args.key)
        await cache.update(args.options)
        return await cache.calculateAt(args.options.offset)
    }

    /**
     * Queries multiple cache keys in parallel and combines the results.
     * Each key represents a unique party-template-interface combination to be queried independently.
     */
    private async query(args: {
        options: AcsOptions
        keys: ACSKey[]
    }): Promise<Array<LedgerTypes['JsGetActiveContractsResponse']>> {
        const { options, keys } = args
        return (
            await Promise.all(
                keys.map(
                    async (key) => await this.updateCache({ options, key })
                )
            )
        ).flat()
    }

    private serializeKey(key: ACSKey): string {
        return `${key.party ?? 'ANY'}_T${key.templateId ?? '()'}_I${key.interfaceId ?? '()'}`
    }
}
