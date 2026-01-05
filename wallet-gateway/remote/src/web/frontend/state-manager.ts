// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

class StateManager {
    static localStorageKey(item: string): string {
        return `com.splice.wallet.${item}`
    }

    private state: Map<string, string> = new Map()

    private getWithStorage(key: string): string | undefined {
        if (this.state.has(key)) {
            return this.state.get(key)
        }

        const value = localStorage.getItem(StateManager.localStorageKey(key))

        if (value) {
            this.state.set(key, value)
            return value
        }

        return undefined
    }

    private setWithStorage(key: string, value: string) {
        localStorage.setItem(StateManager.localStorageKey(key), value)
        this.state.set(key, value)
    }

    private clearWithStorage(key: string) {
        localStorage.removeItem(StateManager.localStorageKey(key))
        this.state.delete(key)
    }

    accessToken = {
        get: () => this.getWithStorage('accessToken'),
        set: (token: string) => this.setWithStorage('accessToken', token),
        clear: () => this.clearWithStorage('accessToken'),
    }

    networkId = {
        get: () => this.getWithStorage('networkId'),
        set: (networkId: string) => this.setWithStorage('networkId', networkId),
        clear: () => this.clearWithStorage('networkId'),
    }

    expirationDate = {
        get: () => this.getWithStorage('expirationDate'),
        set: (expirationDate: string) =>
            this.setWithStorage('expirationDate', expirationDate),
        clear: () => this.clearWithStorage('expirationDate'),
    }
}

export const stateManager = new StateManager()
