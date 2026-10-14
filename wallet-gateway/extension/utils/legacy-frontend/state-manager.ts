// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { storage } from 'wxt/utils/storage'
import { browser } from 'wxt/browser'
import type { AllowedRoute } from '@canton-network/core-wallet-ui-components'
import { destroyTokenKey } from './access-token-utils.js'
import { createProxyService } from '@webext-core/proxy-service'
import { AUTH_SERVICE_KEY } from '@/utils/constants'

const STORAGE_PREFIX = 'com.splice.wallet.'
const VERSION_PREFIX = `${STORAGE_PREFIX}v1`

// We enforce the return type so TypeScript knows it always starts with local: or session:
export type WxtStorageKey = `local:${string}` | `session:${string}`

export class StateManager {
    static getStorageKey(
        item: string,
        origin: string,
        type: 'local' | 'session' = 'local'
    ): WxtStorageKey {
        return `${type}:${VERSION_PREFIX}.${origin}.${item}` as WxtStorageKey
    }

    constructor() {
        // Run async cleanup in the background
        void this.cleanupOldVersions()
    }

    private async cleanupOldVersions() {
        try {
            // WXT storage doesn't have getKeys, so we use the native browser API
            const localData = await browser.storage.local.get(null)
            const sessionData = await browser.storage.session.get(null)

            const localKeys = Object.keys(localData).map(
                (k) => `local:${k}` as WxtStorageKey
            )
            const sessionKeys = Object.keys(sessionData).map(
                (k) => `session:${k}` as WxtStorageKey
            )
            const allKeys = [...localKeys, ...sessionKeys]

            for (const key of allKeys) {
                const keyWithoutType = key.replace(/^(local:|session:)/, '')
                if (
                    keyWithoutType.startsWith(STORAGE_PREFIX) &&
                    !keyWithoutType.startsWith(VERSION_PREFIX)
                ) {
                    await storage.removeItem(key)
                }
            }
        } catch (error) {
            logger.warn('Failed to cleanup old storage versions: {*}', {
                error,
            })
        }
    }

    private async getWithStorage<T>(
        key: string,
        origin: string,
        type: 'local' | 'session' = 'local'
    ): Promise<T | null> {
        return await storage.getItem<T>(
            StateManager.getStorageKey(key, origin, type)
        )
    }

    private async setWithStorage<T>(
        key: string,
        value: T,
        origin: string,
        type: 'local' | 'session' = 'local'
    ): Promise<void> {
        await storage.setItem<T>(
            StateManager.getStorageKey(key, origin, type),
            value
        )
    }

    private async clearWithStorage(
        key: string,
        origin: string,
        type: 'local' | 'session' = 'local'
    ): Promise<void> {
        await storage.removeItem(StateManager.getStorageKey(key, origin, type))
    }

    accessToken = {
        get: (origin: string): Promise<string | null> =>
            this.getWithStorage<string>('accessToken', origin),
        set: (token: string, origin: string) =>
            this.setWithStorage('accessToken', token, origin),
        clear: (origin: string) => this.clearWithStorage('accessToken', origin),
    }

    networkId = {
        get: (origin: string) =>
            this.getWithStorage<string>('networkId', origin),
        set: (networkId: string, origin: string) =>
            this.setWithStorage('networkId', networkId, origin),
        clear: (origin: string) => this.clearWithStorage('networkId', origin),
    }

    expirationDate = {
        get: (origin: string) =>
            this.getWithStorage<string>('expirationDate', origin),
        set: (expirationDate: string, origin: string) =>
            this.setWithStorage('expirationDate', expirationDate, origin),
        clear: (origin: string) =>
            this.clearWithStorage('expirationDate', origin),
    }

    intendedPage = {
        get: (origin: string) =>
            this.getWithStorage<AllowedRoute>('intendedPage', origin),
        set: (page: AllowedRoute, origin: string) =>
            this.setWithStorage('intendedPage', page, origin),
        clear: (origin: string) =>
            this.clearWithStorage('intendedPage', origin),
    }

    currentOrigin = {
        get: () => this.getWithStorage<string>('origin', 'current', 'session'),
        set: (origin: string) =>
            this.setWithStorage('origin', origin, 'current', 'session'),
        clear: () => this.clearWithStorage('origin', 'current', 'session'),
    }

    sessionId = {
        get: (origin: string) =>
            this.getWithStorage<string>('sessionId', origin),
        set: (sessionId: string, origin: string) =>
            this.setWithStorage('sessionId', sessionId, origin),
        clear: (origin: string) => this.clearWithStorage('sessionId', origin),
    }

    async clearAuthState(origin: string): Promise<void> {
        try {
            const authClient = createProxyService(AUTH_SERVICE_KEY)
            await authClient.clearAuthContext()
        } finally {
            await this.accessToken.clear(origin)
            await this.networkId.clear(origin)
            await this.expirationDate.clear(origin)
            await this.intendedPage.clear(origin)
            await this.sessionId.clear(origin)
        }
    }

    async revokeAccessToken(origin: string): Promise<void> {
        try {
            const authClient = createProxyService(AUTH_SERVICE_KEY)
            await authClient.clearAuthContext()
        } finally {
            await this.accessToken.clear(origin)
            await destroyTokenKey()
        }
    }
}

export const stateManager = new StateManager()
