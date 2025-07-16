// Account

import { NetworkConfig } from './config/schema'

export enum AddressType {
    PaperAddress = 'PaperAddress',
    CCSPAddress = 'CCSPAddress',
}

export type PartyId = string

export interface SigningDriver {
    signingDriverId: string
}

export interface SigningProvider {
    signingProviderId: string
    privateKey?: string
    addressType: AddressType
}

export interface WalletFilter {
    networkIds?: string[]
    signingProviderIds?: string[]
}

export interface Wallet {
    primary: boolean
    partyId: PartyId
    hint: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
}

// Session management

export interface Session {
    network: string
    accessToken: string
}

export interface Transaction {
    status: 'pending' | 'signed' | 'executed' | 'failed'
    commandId: string
    preparedTransaction: string
    preparedTransactionHash: string
    payload?: unknown
}

// Store interface for managing wallets, sessions, networks, and transactions

export interface Store {
    // Wallet methods
    getWallets(): Promise<Array<Wallet>>
    getPrimaryWallet(): Promise<Wallet | undefined>
    setPrimaryWallet(partyId: PartyId): Promise<void>
    addWallet(wallet: Wallet): Promise<void>

    // Session methods
    getSession(): Promise<Session | undefined>
    setSession(session: Session): Promise<void>
    removeSession(): Promise<void>

    // Network methods
    getNetwork(name: string): Promise<NetworkConfig>
    getCurrentNetwork(): Promise<NetworkConfig>
    listNetworks(): Promise<Array<NetworkConfig>>
    updateNetwork(network: NetworkConfig): Promise<void>
    addNetwork(network: NetworkConfig): Promise<void>
    removeNetwork(name: string): Promise<void>

    // Transaction methods
    setTransaction(tx: Transaction): Promise<void>
    getTransaction(commandId: string): Promise<Transaction | undefined>
}
