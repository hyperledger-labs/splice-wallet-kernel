// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { AllowedRoute } from '@canton-network/core-wallet-ui-components'
import {
    encryptString,
    destroyTokenKey,
    decryptString,
} from './access-token-utils.js'

const VERSION_PREFIX = 'com.splice.wallet.v1'

export class StateManager {
    static localStorageKey(item: string, origin: string): string {
        return `${VERSION_PREFIX}.${origin}.${item}`
    }

    constructor() {
        // delete any old storage entries not corresponding to the current version
        for (const key in localStorage) {
            if (!key.startsWith(VERSION_PREFIX)) {
                localStorage.removeItem(key)
            }
        }
    }

    private state: Map<string, string> = new Map()

    private getWithStorage(
        key: string,
        origin: string,
        storage: Storage = localStorage
    ): string | undefined {
        if (this.state.has(key)) {
            return this.state.get(key)
        }

        const value = storage.getItem(StateManager.localStorageKey(key, origin))

        if (value) {
            this.state.set(key, value)
            return value
        }

        return undefined
    }

    private setWithStorage(
        key: string,
        value: string,
        origin: string,
        storage: Storage = localStorage
    ) {
        storage.setItem(StateManager.localStorageKey(key, origin), value)
        this.state.set(key, value)
    }

    private clearWithStorage(
        key: string,
        origin: string,
        storage: Storage = localStorage
    ) {
        storage.removeItem(StateManager.localStorageKey(key, origin))
        this.state.delete(key)
    }

    // cache access tokens per origin
    private accessTokenCache: Map<string, string> = new Map()

    accessToken = {
        get: async (origin: string): Promise<string | undefined> => {
            if (this.accessTokenCache.has(origin)) {
                return this.accessTokenCache.get(origin)
            }
            const stored = localStorage.getItem(
                StateManager.localStorageKey('accessToken', origin)
            )
            if (!stored) {
                return undefined
            }
            try {
                this.accessTokenCache.set(origin, await decryptString(stored))
            } catch (error) {
                localStorage.removeItem(
                    StateManager.localStorageKey('accessToken', origin)
                )
                console.warn(error)
                this.accessTokenCache.delete(origin)
            }
            return this.accessTokenCache.get(origin)
        },
        set: async (token: string, origin: string) => {
            const encryptedToken = await encryptString(token)
            localStorage.setItem(
                StateManager.localStorageKey('accessToken', origin),
                encryptedToken
            )
            this.accessTokenCache.set(origin, token)
        },
        clear: async (origin: string) => {
            localStorage.removeItem(
                StateManager.localStorageKey('accessToken', origin)
            )
            this.accessTokenCache.delete(origin)
        },
    }

    networkId = {
        get: (origin: string) => this.getWithStorage('networkId', origin),
        set: (networkId: string, origin: string) =>
            this.setWithStorage('networkId', networkId, origin),
        clear: (origin: string) => this.clearWithStorage('networkId', origin),
    }

    expirationDate = {
        get: (origin: string) => this.getWithStorage('expirationDate', origin),
        set: (expirationDate: string, origin: string) =>
            this.setWithStorage('expirationDate', expirationDate, origin),
        clear: (origin: string) =>
            this.clearWithStorage('expirationDate', origin),
    }

    intendedPage = {
        get: (origin: string) =>
            this.getWithStorage('intendedPage', origin) as
                AllowedRoute | undefined,
        set: (page: AllowedRoute, origin: string) =>
            this.setWithStorage('intendedPage', page, origin),
        clear: (origin: string) =>
            this.clearWithStorage('intendedPage', origin),
    }

    currentOrigin = {
        get: () => this.getWithStorage('origin', 'current', sessionStorage),
        set: (origin: string) =>
            this.setWithStorage('origin', origin, 'current', sessionStorage),
        clear: () => this.clearWithStorage('origin', 'current', sessionStorage),
    }

    sessionId = {
        get: (origin: string) => this.getWithStorage('sessionId', origin),
        set: (sessionId: string, origin: string) =>
            this.setWithStorage('sessionId', sessionId, origin),
        clear: (origin: string) => this.clearWithStorage('sessionId', origin),
    }

    selfIssuedLoginSessionId = {
        get: (origin: string) =>
            this.getWithStorage(
                'selfIssuedLoginSessionId',
                origin,
                sessionStorage
            ),
        set: (sessionId: string, origin: string) =>
            this.setWithStorage(
                'selfIssuedLoginSessionId',
                sessionId,
                origin,
                sessionStorage
            ),
        clear: (origin: string) =>
            this.clearWithStorage(
                'selfIssuedLoginSessionId',
                origin,
                sessionStorage
            ),
    }

    async clearAuthState(origin: string): Promise<void> {
        await this.accessToken.clear(origin)
        this.networkId.clear(origin)
        this.expirationDate.clear(origin)
        this.intendedPage.clear(origin)
        this.sessionId.clear(origin)
        this.selfIssuedLoginSessionId.clear(origin)
    }

    async revokeAccessToken(origin: string): Promise<void> {
        await this.accessToken.clear(origin)
        await destroyTokenKey()
    }
}

export const stateManager = new StateManager()
