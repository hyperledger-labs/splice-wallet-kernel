// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 *
 * Network ID
 *
 */
export type NetworkId = string
/**
 *
 * Name of network
 *
 */
export type Name = string
/**
 *
 * Description of network
 *
 */
export type Description = string
/**
 *
 * Synchronizer ID
 *
 */
export type SynchronizerId = string
export type Type = string
export type IdentityProviderId = string
export type TokenUrl = string
export type GrantType = string
export type Scope = string
export type ClientId = string
export type ClientSecret = string
export type Issuer = string
export type ConfigUrl = string
export type Audience = string
export interface Admin {
    clientId: ClientId
    clientSecret: ClientSecret
    [k: string]: any
}
/**
 *
 * Represents the type of auth (implicit or password) for a specified network
 *
 */
export interface Auth {
    authType?: Type
    identityProviderId: IdentityProviderId
    tokenUrl?: TokenUrl
    grantType?: GrantType
    scope?: Scope
    clientId?: ClientId
    clientSecret?: ClientSecret
    issuer: Issuer
    configUrl: ConfigUrl
    audience?: Audience
    admin?: Admin
    [k: string]: any
}
/**
 *
 * Ledger api url
 *
 */
export type LedgerApi = string
/**
 *
 * Structure representing the Networks
 *
 */
export interface Network {
    id: NetworkId
    name: Name
    description: Description
    synchronizerId: SynchronizerId
    auth: Auth
    ledgerApi: LedgerApi
}
/**
 *
 * Ledger api url
 *
 */
export type NetworkName = string
/**
 *
 * Set as primary wallet for dApp usage.
 *
 */
export type Primary = boolean
/**
 *
 * The party hint and name of the wallet.
 *
 */
export type PartyHint = string
/**
 *
 * The signing provider ID the wallet corresponds to.
 *
 */
export type SigningProviderId = string
export type PartyId = string
/**
 *
 * Filter wallets by network IDs.
 *
 */
export type NetworkIds = NetworkId[]
/**
 *
 * Filter wallets by signing provider IDs.
 *
 */
export type SigningProviderIds = SigningProviderId[]
/**
 *
 * Filter for the wallets to be returned.
 *
 */
export interface WalletFilter {
    networkIds?: NetworkIds
    signingProviderIds?: SigningProviderIds
    [k: string]: any
}
export type PreparedTransaction = string
export type PreparedTransactionHash = string
/**
 *
 * The command ID of the transaction to be executed.
 *
 */
export type CommandId = string
export type Signature = string
export type SignedBy = string
/**
 *
 * The party hint and name of the wallet.
 *
 */
export type Hint = string
/**
 *
 * The public key of the party.
 *
 */
export type PublicKey = string
/**
 *
 * The namespace of the party.
 *
 */
export type Namespace = string
/**
 *
 * Structure representing a wallet
 *
 */
export interface Wallet {
    primary: Primary
    partyId: PartyId
    hint: Hint
    publicKey: PublicKey
    namespace: Namespace
    networkId: NetworkId
    signingProviderId: SigningProviderId
    [k: string]: any
}
export type Added = Wallet[]
export type Removed = Wallet[]
export type Networks = Network[]
/**
 *
 * The user ID associated with the session.
 *
 */
export type UserId = string
/**
 *
 * The access token for the session.
 *
 */
export type AccessToken = string
export type Status = 'connected' | 'disconnected'
/**
 *
 * Structure representing the connected network session
 *
 */
export interface Session {
    network: Network
    userId?: UserId
    accessToken: AccessToken
    status: Status
}
export type Sessions = Session[]
export interface AddNetworkParams {
    network: Network
    [k: string]: any
}
export interface RemoveNetworkParams {
    networkName: NetworkName
    [k: string]: any
}
export interface CreateWalletParams {
    primary?: Primary
    partyHint: PartyHint
    networkId: NetworkId
    signingProviderId: SigningProviderId
    [k: string]: any
}
export interface SetPrimaryWalletParams {
    partyId: PartyId
    [k: string]: any
}
export interface RemoveWalletParams {
    partyId: PartyId
    [k: string]: any
}
export interface ListWalletsParams {
    filter?: WalletFilter
    [k: string]: any
}
export interface SignParams {
    preparedTransaction: PreparedTransaction
    preparedTransactionHash: PreparedTransactionHash
    commandId: CommandId
    partyId: PartyId
    [k: string]: any
}
export interface ExecuteParams {
    signature: Signature
    partyId: PartyId
    commandId: CommandId
    signedBy: SignedBy
    [k: string]: any
}
export interface AddSessionParams {
    networkId: NetworkId
    [k: string]: any
}
/**
 *
 * Represents a null value, used in responses where no data is returned.
 *
 */
export type Null = null
export interface CreateWalletResult {
    wallet: Wallet
    [k: string]: any
}
export interface RemovePartyResult {
    [key: string]: any
}
/**
 *
 * An array of wallets that match the filter criteria.
 *
 */
export type ListWalletsResult = Wallet[]
/**
 *
 * Added and removed wallets as a result of the sync.
 *
 */
export interface SyncWalletsResult {
    added: Added
    removed: Removed
    [k: string]: any
}
export interface SignResult {
    signature: Signature
    partyId: PartyId
    signedBy: SignedBy
    [k: string]: any
}
export interface ExecuteResult {
    [key: string]: any
}
export interface ListNetworksResult {
    networks: Networks
    [k: string]: any
}
/**
 *
 * Structure representing the connected network session
 *
 */
export interface AddSessionResult {
    network: Network
    userId?: UserId
    accessToken: AccessToken
    status: Status
}
export interface ListSessionsResult {
    sessions: Sessions
    [k: string]: any
}
/**
 *
 * Generated! Represents an alias to any of the provided schemas
 *
 */

export type AddNetwork = (params: AddNetworkParams) => Promise<Null>
export type RemoveNetwork = (params: RemoveNetworkParams) => Promise<Null>
export type CreateWallet = (
    params: CreateWalletParams
) => Promise<CreateWalletResult>
export type SetPrimaryWallet = (params: SetPrimaryWalletParams) => Promise<Null>
export type RemoveWallet = (
    params: RemoveWalletParams
) => Promise<RemovePartyResult>
export type ListWallets = (
    params: ListWalletsParams
) => Promise<ListWalletsResult>
export type SyncWallets = () => Promise<SyncWalletsResult>
export type Sign = (params: SignParams) => Promise<SignResult>
export type Execute = (params: ExecuteParams) => Promise<ExecuteResult>
export type ListNetworks = () => Promise<ListNetworksResult>
export type AddSession = (params: AddSessionParams) => Promise<AddSessionResult>
export type ListSessions = () => Promise<ListSessionsResult>
