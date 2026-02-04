// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { RequestArgsV2, UnknownRpcTypes } from '@canton-network/core-types'

export type EventListener<T> = (...args: T[]) => void

export interface Provider<T extends UnknownRpcTypes> {
    request<M extends keyof T>(
        args: RequestArgsV2<T, M>
    ): Promise<T[M]['result']>

    on<E>(event: string, listener: EventListener<E>): Provider<T>
    emit<E>(event: string, ...args: E[]): boolean
    removeListener<E>(
        event: string,
        listenerToRemove: EventListener<E>
    ): Provider<T>
}

export abstract class AbstractProvider<
    T extends UnknownRpcTypes,
> implements Provider<T> {
    listeners: { [event: string]: EventListener<unknown>[] }

    constructor() {
        this.listeners = {} // Event listeners
    }

    abstract request<M extends keyof T>(
        args: RequestArgsV2<T, M>
    ): Promise<T[M]['result']>

    // Event handling
    public on<E>(event: string, listener: EventListener<E>): Provider<T> {
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
    ): Provider<T> {
        if (!this.listeners[event]) return this

        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== listenerToRemove
        )

        return this
    }
}
