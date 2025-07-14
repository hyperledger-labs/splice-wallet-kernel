import { TxChanged } from 'core-types'
import { Wallet } from 'core-wallet-store'

// Define the structure of the events that can be emitted by the Notifier
// The field name represents event names, and the associated type is message schema.
type SupportedEvents = {
    accountsChanged: Wallet[]
    txChanged: TxChanged
}

// Support event-driven notifications. We represent a notifier with a generic interface to support node and browser implementations.
type EventListener = (...args: unknown[]) => void
export interface Notifier {
    on<T extends keyof SupportedEvents>(event: T, listener: EventListener): void

    emit<T extends keyof SupportedEvents>(
        event: T,
        ...args: SupportedEvents[T][]
    ): boolean

    removeListener<T extends keyof SupportedEvents>(
        event: T,
        listenerToRemove: EventListener
    ): void
}

export interface NotificationService {
    getNotifier(notifierId: string): Notifier
}
