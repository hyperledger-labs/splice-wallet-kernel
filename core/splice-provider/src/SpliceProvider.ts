// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import SpliceWalletJSONRPCDAppAPI, {
    RpcMethods,
} from '@canton-network/core-wallet-dapp-rpc-client'

export type EventListener<T> = (...args: T[]) => void

export interface SpliceProvider {
    request<M extends keyof RpcMethods>(
        method: M,
        params?: RpcMethods[M]['params'][0]
    ): Promise<RpcMethods[M]['result']>
    on<T>(event: string, listener: EventListener<T>): SpliceProvider
    emit<T>(event: string, ...args: T[]): boolean
    removeListener<T>(
        event: string,
        listenerToRemove: EventListener<T>
    ): SpliceProvider
}

export abstract class SpliceProviderBase implements SpliceProvider {
    listeners: { [event: string]: EventListener<unknown>[] }
    _client: SpliceWalletJSONRPCDAppAPI

    constructor(client: SpliceWalletJSONRPCDAppAPI) {
        this.listeners = {} // Event listeners
        this._client = client
    }

    public async request(
        method: keyof RpcMethods,
        params?: RpcMethods[typeof method]['params'][0]
    ): Promise<RpcMethods[typeof method]['result']> {
        return this._client.request(method, params)
    }

    // Event handling
    public on<T>(event: string, listener: EventListener<T>): SpliceProvider {
        if (!this.listeners[event]) {
            this.listeners[event] = []
        }
        const listeners = this.listeners[event] as EventListener<T>[]
        listeners.push(listener)

        return this
    }

    public emit<T>(event: string, ...args: T[]): boolean {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => listener(...args))
            return true
        }
        return false
    }

    public removeListener<T>(
        event: string,
        listenerToRemove: EventListener<T>
    ): SpliceProvider {
        if (!this.listeners[event]) return this

        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== listenerToRemove
        )

        return this
    }
}
