// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    RequestArgsV2,
    RequestPayload,
    UnknownRpcTypes,
} from '@canton-network/core-types'

export type EventListener<T> = (...args: T[]) => void

export interface SpliceProvider {
    request<T>(args: RequestPayload): Promise<T>
    on<T>(event: string, listener: EventListener<T>): SpliceProvider
    emit<T>(event: string, ...args: T[]): boolean
    removeListener<T>(
        event: string,
        listenerToRemove: EventListener<T>
    ): SpliceProvider
}

export abstract class SpliceProviderBase implements SpliceProvider {
    listeners: { [event: string]: EventListener<unknown>[] }

    constructor() {
        this.listeners = {} // Event listeners
    }

    abstract request<T>(args: RequestPayload): Promise<T>

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

export interface ProviderV2<T extends UnknownRpcTypes> {
    request<M extends keyof T>(
        args: RequestArgsV2<T, M>
    ): Promise<T[M]['result']>

    on<E>(event: string, listener: EventListener<E>): ProviderV2<T>
    emit<E>(event: string, ...args: E[]): boolean
    removeListener<E>(
        event: string,
        listenerToRemove: EventListener<E>
    ): ProviderV2<T>
}

export abstract class AbstractProviderV2<
    T extends UnknownRpcTypes,
> implements ProviderV2<T> {
    listeners: { [event: string]: EventListener<unknown>[] }

    constructor() {
        this.listeners = {} // Event listeners
    }

    abstract request<M extends keyof T>(
        args: RequestArgsV2<T, M>
    ): Promise<T[M]['result']>

    // Event handling
    public on<E>(event: string, listener: EventListener<E>): ProviderV2<T> {
        if (!this.listeners[event]) {
            this.listeners[event] = []
        }
        const listeners = this.listeners[event] as EventListener<E>[]
        listeners.push(listener)

        return this
    }

    public emit<E>(event: string, ...args: E[]): boolean {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => listener(...args))
            return true
        }
        return false
    }

    public removeListener<E>(
        event: string,
        listenerToRemove: EventListener<E>
    ): ProviderV2<T> {
        if (!this.listeners[event]) return this

        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== listenerToRemove
        )

        return this
    }
}
