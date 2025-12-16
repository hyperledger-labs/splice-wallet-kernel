// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LRUCache } from 'typescript-lru-cache'
import {
    Store,
    Network,
    VerifiedNetwork,
} from '@canton-network/core-wallet-store'
import { Logger } from 'pino'

export const DEFAULT_MAX_CACHE_SIZE = 100
export const DEFAULT_ENTRY_EXPIRATION_TIME = 10 * 60 * 1000

const NetworkCache = new LRUCache<string, VerifiedNetwork>({
    maxSize: DEFAULT_MAX_CACHE_SIZE,
    entryExpirationTimeInMS: DEFAULT_ENTRY_EXPIRATION_TIME,
})

export class NetworkCacheStore {
    constructor(
        private readonly store: Store,
        private readonly logger: Logger
    ) {}

    getCache() {
        return NetworkCache
    }

    getStore() {
        return this.store
    }

    async getNetwork(networkId: string): Promise<VerifiedNetwork> {
        const cachedNetwork = NetworkCache.get(networkId)
        if (cachedNetwork) {
            return cachedNetwork
        }
        return await this.store.getNetwork(networkId)
    }

    getCurrentNetwork(): Promise<VerifiedNetwork> {
        return this.store.getCurrentNetwork()
    }

    listNetworks(): Promise<Array<VerifiedNetwork>> {
        if (NetworkCache.size !== 0) {
            return Promise.resolve(NetworkCache.values().toArray())
        }
        return this.store.listNetworks()
    }

    updateNetwork(network: Network): Promise<void> {
        NetworkCache.set(network.id, {
            ...network,
            verified: false,
        })

        return this.store.updateNetwork(network)
    }

    addNetwork(network: Network): Promise<void> {
        NetworkCache.set(network.id, {
            ...network,
            verified: false,
        })

        return this.store.addNetwork(network)
    }
    removeNetwork(networkId: string): Promise<void> {
        NetworkCache.delete(networkId)

        return this.store.removeNetwork(networkId)
    }
}
