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
/**
 *
 * Identity Provider ID
 *
 */
export type IdentityProviderId = string
export type Method = string
export type Scope = string
export type ClientId = string
export type ClientSecret = string
export type Issuer = string
export type Audience = string
/**
 *
 * Represents the type of auth for a specified network
 *
 */
export interface Auth {
    method: Method
    scope: Scope
    clientId: ClientId
    clientSecret?: ClientSecret
    issuer?: Issuer
    audience: Audience
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
    identityProviderId: IdentityProviderId
    auth: Auth
    adminAuth?: Auth
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
 * ID of the identity provider
 *
 */
export type Id = string
/**
 *
 * Type of identity provider (oauth)
 *
 */
export type Type = string
/**
 *
 * A self-signed identity provider
 *
 */
export interface IdpSelfSigned {
    id: Id
    type: Type
    issuer: Issuer
}
/**
 *
 * URL to fetch the identity provider configuration
 *
 */
export type ConfigUrl = string
/**
 *
 * A OAuth2 identity provider
 *
 */
export interface IdpOAuth2 {
    id: Id
    type: Type
    issuer: Issuer
    configUrl?: ConfigUrl
}
/**
 *
 * Structure representing the Identity Providers
 *
 */
export type Idp = IdpSelfSigned | IdpOAuth2
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
export type Networks = Network[]
export type Idps = Idp[]
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
export interface AddIdpParams {
    idp: Idp
    [k: string]: any
}
export interface RemoveIdpParams {
    identityProviderId: IdentityProviderId
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
export interface ListNetworksResult {
    networks: Networks
    [k: string]: any
}
export interface ListIdpsResult {
    idps: Idps
}
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
/**
 *
 * Structure representing the connected network session
 *
 */
export interface AddSessionResult {
    network: Network
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
export type ListNetworks = () => Promise<ListNetworksResult>
export type AddIdp = (params: AddIdpParams) => Promise<Null>
export type RemoveIdp = (params: RemoveIdpParams) => Promise<Null>
export type ListIdps = () => Promise<ListIdpsResult>
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
export type AddSession = (params: AddSessionParams) => Promise<AddSessionResult>
export type ListSessions = () => Promise<ListSessionsResult>
