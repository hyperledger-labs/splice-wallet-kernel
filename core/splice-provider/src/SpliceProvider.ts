import { RequestPayload } from '@hyperledger-labs/core-types'

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
