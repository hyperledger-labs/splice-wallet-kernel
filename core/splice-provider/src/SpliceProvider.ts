export type EventListener = (...args: unknown[]) => void

export interface RequestArguments {
    readonly method: string
    readonly params?: readonly unknown[] | object
}

export enum EventTypes {
    SPLICE_WALLET_REQUEST = 'SPLICE_WALLET_REQUEST',
    SPLICE_WALLET_RESPONSE = 'SPLICE_WALLET_RESPONSE',
}

export interface SpliceProvider {
    request<T>(args: RequestArguments): Promise<T>
    on(event: string, listener: EventListener): SpliceProvider
    emit(event: string, ...args: unknown[]): boolean
    removeListener(
        event: string,
        listenerToRemove: EventListener
    ): SpliceProvider
}

export abstract class SpliceProviderBase implements SpliceProvider {
    listeners: { [event: string]: EventListener[] }

    constructor() {
        this.listeners = {} // Event listeners
    }

    abstract request<T>(args: RequestArguments): Promise<T>

    // Event handling
    public on(event: string, listener: EventListener): SpliceProvider {
        if (!this.listeners[event]) {
            this.listeners[event] = []
        }
        this.listeners[event].push(listener)

        return this
    }

    public emit(event: string, ...args: unknown[]): boolean {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => listener(...args))
            return true
        }
        return false
    }

    public removeListener(
        event: string,
        listenerToRemove: EventListener
    ): SpliceProvider {
        if (!this.listeners[event]) return this

        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== listenerToRemove
        )

        return this
    }
}
