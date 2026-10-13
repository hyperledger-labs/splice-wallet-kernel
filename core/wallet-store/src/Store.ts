// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Idp } from '@canton-network/core-wallet-auth'
import type { Network } from './config/schema'

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

export type CurrentNetworkWalletFilter = Omit<WalletFilter, 'networkIds'>

export enum PartyLevelRight {
    CanActAs = 'CanActAs',
    CanReadAs = 'CanReadAs',
    CanExecuteAs = 'CanExecuteAs',
}

export enum UserLevelRight {
    CanReadAsAnyParty = 'CanReadAsAnyParty',
    CanExecuteAsAnyParty = 'CanExecuteAsAnyParty',
}

export type WalletStatus = 'initialized' | 'allocated' | 'removed'

export interface Wallet {
    primary: boolean
    status: WalletStatus
    partyId: PartyId
    hint: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
    externalTxId?: string
    topologyTransactions?: string
    disabled?: boolean
    reason?: string
    isAuthParty?: boolean
    rights: PartyLevelRight[]
    userId: string
    // hosted: [network]
}

export type WalletUniqueConstraint = Pick<
    Wallet,
    'networkId' | 'partyId' | 'userId'
>

export type UpdateWallet =
    // Required items
    Pick<Wallet, 'partyId'> &
        // Optional items
        Partial<
            Pick<
                Wallet,
                | 'networkId'
                | 'status'
                | 'externalTxId'
                | 'topologyTransactions'
                | 'disabled'
                | 'reason'
                | 'primary'
                | 'rights'
                | 'signingProviderId'
                | 'publicKey'
                | 'namespace'
                | 'isAuthParty'
            >
        >

// Session management

export interface Session {
    id: string
    origin: string
    network: string
    /** Absent only while self-issued onboarding is in progress. */
    accessToken?: string
    userId?: string
}

export interface Transaction {
    id: string
    status: 'pending' | 'signed' | 'executed' | 'failed' | 'awaiting-signature'
    commandId: string
    preparedTransaction: string
    preparedTransactionHash: string
    payload?: unknown
    origin: string | null
    createdAt?: Date
    signedAt?: Date
    externalTxId?: string
    userId?: string
    networkId?: string
    failureReason?: string
}

export interface TransactionStatusUpdate {
    payload?: unknown
    signedAt?: Date
    externalTxId?: string
    failureReason?: string
}

export interface ListTransactionsOptions {
    cursor?: string
    limit?: number
}

export interface MessageRaw {
    id: string
    status: 'pending' | 'signed' | 'failed'
    userId: string
    partyId: PartyId
    publicKey: string
    message: string
    origin: string | null
    createdAt: Date
    signedAt?: Date
    signature?: string
}

export interface MessageRawStatusUpdate {
    signedAt?: Date
    signature?: string
}

// API keys
export interface ApiKey {
    id: string
    name: string
    digest: string
    createdAt: Date
    lastUsedAt?: Date | undefined
    userId: string
    email: string | null
    networkId: string
}

// Store interface for managing wallets, sessions, networks, and transactions

export interface Store {
    // Wallet methods
    getWallets(filter?: CurrentNetworkWalletFilter): Promise<Array<Wallet>>
    getWallet(partyId: PartyId): Promise<Wallet | null>
    /**
     * Looks up a wallet for self-issued JWT verification, before there is a session.
     * Resolves exactly one `self_issued` network whose audience is in `audiences`,
     * then the wallet by userId, partyId, and that networkId.
     * Throws if more than one self-issued network matches.
     */
    getWalletByJwt(
        userId: string,
        partyId: PartyId,
        audiences: string[]
    ): Promise<Wallet | undefined>
    getAllWallets(filter?: WalletFilter): Promise<Array<Wallet>>
    getPrimaryWallet(): Promise<Wallet | undefined>
    setPrimaryWallet(partyId: PartyId): Promise<void>
    addWallet(wallet: Wallet): Promise<void>
    updateWallet(params: UpdateWallet): Promise<void>
    removeWallet(partyId: PartyId): Promise<void>
    getUserRights(networkId?: string): Promise<Array<UserLevelRight>>
    setUserRights(
        networkId: string,
        rights: Array<UserLevelRight>
    ): Promise<void>

    // Session methods
    /**
     * getSession is keyed by the accessToken, which is unique per session. It retrieves the session associated with the provided accessToken.
     * @param accessToken The access token associated with the session to retrieve.
     * @returns A Promise that resolves to the Session object if found, or undefined if no session exists for the given accessToken.
     */
    getSession(accessToken: string): Promise<Session | undefined>

    /**
     * listSessions retrieves all active sessions for the authenticated user.
     * @returns A Promise that resolves to an array of Session objects representing the active sessions.
     */
    listSessions(): Promise<Array<Session>>

    setSession(session: Session): Promise<void>

    /**
     * removeSession is keyed by the accessToken, which is unique per session. It removes the session associated with the provided accessToken.
     * @param accessToken The access token associated with the session to remove.
     * @returns A Promise that resolves when the session has been removed.
     */
    removeSession(accessToken: string): Promise<void>

    /**
     * Looks up a tokenless self-issued onboarding session by id without scoping
     * to the authenticated user, because the session is what identifies the user.
     * Returns undefined once the session has been upgraded with an access token.
     */
    getOnboardingSession(sessionId: string): Promise<Session | undefined>

    /**
     * Sets the access token on the authenticated user's tokenless onboarding session,
     * keeping its id, and removes the user's other sessions for the same origin.
     */
    upgradeOnboardingSession(
        sessionId: string,
        accessToken: string
    ): Promise<Session>

    // IDP methods
    getIdp(idpId: string): Promise<Idp>
    listIdps(): Promise<Array<Idp>>
    updateIdp(idp: Idp): Promise<void>
    addIdp(idp: Idp): Promise<void>
    removeIdp(idpId: string): Promise<void>

    // Network methods
    getNetwork(networkId: string): Promise<Network>
    getCurrentNetwork(): Promise<Network>
    /**
     * Looks up a self_signed network without scoping to the authenticated user,
     * because this runs during token verification, before there is one.
     * Returns undefined for unknown networks and for networks using any other
     * auth method.
     */
    getNetworkForTokenVerification(
        networkId: string
    ): Promise<Network | undefined>
    listNetworks(): Promise<Array<Network>>
    updateNetwork(network: Network): Promise<void>
    addNetwork(network: Network): Promise<void>
    removeNetwork(networkId: string): Promise<void>

    // Transaction methods
    setTransaction(tx: Transaction): Promise<void>
    setTransactionSigned(
        transactionId: string,
        signedAt: Date,
        externalTxId?: string,
        opts?: { expectedStatus: Transaction['status'] }
    ): Promise<boolean>
    setTransactionStatus(
        transactionId: string,
        status: Transaction['status'],
        updates?: TransactionStatusUpdate,
        opts?: { expectedStatus: Transaction['status'] }
    ): Promise<boolean>
    getTransaction(transactionId: string): Promise<Transaction | undefined>
    getLatestTransactionByCommandId(
        commandId: string
    ): Promise<Transaction | undefined>
    listTransactions(
        options?: ListTransactionsOptions
    ): Promise<{ transactions: Array<Transaction>; nextCursor: string | null }>
    listAllPendingTransactions(): Promise<Array<Transaction>>
    removeTransaction(transactionId: string): Promise<void>
    transactionsCount(): Promise<number>

    // Message signing request methods
    setMessageRaw(message: MessageRaw): Promise<void>
    setMessageRawStatus(
        messageId: string,
        status: MessageRaw['status'],
        updates?: MessageRawStatusUpdate
    ): Promise<void>
    getMessageRaw(messageId: string): Promise<MessageRaw | undefined>
    listMessageRaws(): Promise<Array<MessageRaw>>
    removeMessageRaw(messageId: string): Promise<void>

    // API Key methods
    addApiKey(apiKey: ApiKey): Promise<void>
    listApiKeys(): Promise<Array<ApiKey>>
    getApiKey(digest: string): Promise<ApiKey | undefined>
    removeApiKey(apiKeyId: string): Promise<void>
}
