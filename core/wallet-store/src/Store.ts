// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Account

import { Network } from './config/schema'

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

export interface UpdateWallet {
    id: number
    partyId: string
}

export interface Wallet {
    id: number
    primary: boolean
    partyId: PartyId
    hint: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    txId?: string
    transactions?: string
    // hosted: [network]
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
    getWallets(filter?: WalletFilter): Promise<Array<Wallet>>
    getPrimaryWallet(): Promise<Wallet | undefined>
    setPrimaryWallet(partyId: PartyId): Promise<void>
    addWallet(wallet: Omit<Wallet, 'id'>): Promise<void>
    updateWallet(params: UpdateWallet): Promise<void>
    removeWallet(id: number): Promise<void>

    // Session methods
    getSession(): Promise<Session | undefined>
    setSession(session: Session): Promise<void>
    removeSession(): Promise<void>

    // Network methods
    getNetwork(networkId: string): Promise<Network>
    getCurrentNetwork(): Promise<Network>
    listNetworks(): Promise<Array<Network>>
    updateNetwork(network: Network): Promise<void>
    addNetwork(network: Network): Promise<void>
    removeNetwork(networkId: string): Promise<void>

    // Transaction methods
    setTransaction(tx: Transaction): Promise<void>
    getTransaction(commandId: string): Promise<Transaction | undefined>
}
