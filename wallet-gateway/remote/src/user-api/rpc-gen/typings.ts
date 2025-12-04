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
/**
 *
 * Issuer of identity provider
 *
 */
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
    synchronizerId?: SynchronizerId
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
 * Type of identity provider (oauth / self_signed)
 *
 */
export type Type = any
/**
 *
 * The configuration URL for the identity provider.
 *
 */
export type ConfigUrl = string
/**
 *
 * Structure representing the Identity Providers
 *
 */
export interface Idp {
    id: Id
    type: Type
    issuer: Issuer
    configUrl?: ConfigUrl
}
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
 * Unique identifier of the signed transaction given by the Signing Provider. This may not be the same as the internal txId given by the Wallet Gateway.
 *
 */
export type ExternalTxId = string
/**
 *
 * The topology transactions
 *
 */
export type TopologyTransactions = string
/**
 *
 * The namespace of the party.
 *
 */
export type Namespace = string
/**
 *
 * Indicates that the wallet has been created in the database but hasn't yet been allocated by the participant.
 *
 */
export interface SigningProviderContext {
    partyId: PartyId
    externalTxId: ExternalTxId
    topologyTransactions: TopologyTransactions
    namespace: Namespace
    [k: string]: any
}
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
/**
 *
 * The transaction data corresponding to the command ID.
 *
 */
export type PreparedTransaction = string
/**
 *
 * The hash of the prepared transaction.
 *
 */
export type PreparedTransactionHash = string
/**
 *
 * The unique identifier of the command associated with the transaction.
 *
 */
export type CommandId = string
export type Signature = string
export type SignedBy = string
export type Networks = Network[]
export type Idps = Idp[]
/**
 *
 * The status of the wallet.
 *
 */
export type WalletStatus = 'initialized' | 'allocated'
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
 * Structure representing a wallet
 *
 */
export interface Wallet {
    primary: Primary
    partyId: PartyId
    status: WalletStatus
    hint: Hint
    publicKey: PublicKey
    namespace: Namespace
    networkId: NetworkId
    signingProviderId: SigningProviderId
    externalTxId?: ExternalTxId
    topologyTransactions?: TopologyTransactions
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
/**
 *
 * The status of the transaction.
 *
 */
export type Status = string
/**
 *
 * The reason for the current status.
 *
 */
export type Reason = string
/**
 *
 * Structure representing the connected network session
 *
 */
export interface Session {
    network: Network
    idp: Idp
    accessToken: AccessToken
    status: Status
    reason?: Reason
}
export type Sessions = Session[]
/**
 *
 * Optional payload associated with the transaction.
 *
 */
export type Payload = string
export interface Transaction {
    commandId: CommandId
    status: Status
    preparedTransaction: PreparedTransaction
    preparedTransactionHash: PreparedTransactionHash
    payload?: Payload
    [k: string]: any
}
export type Transactions = Transaction[]
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
    signingProviderContext?: SigningProviderContext
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
    idp: Idp
    [k: string]: any
}
export interface GetTransactionParams {
    commandId: CommandId
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
    [k: string]: any
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
    idp: Idp
    accessToken: AccessToken
    status: Status
    reason?: Reason
}
export interface ListSessionsResult {
    sessions: Sessions
    [k: string]: any
}
export interface GetTransactionResult {
    commandId: CommandId
    status: Status
    preparedTransaction: PreparedTransaction
    preparedTransactionHash: PreparedTransactionHash
    payload?: Payload
    [k: string]: any
}
export interface ListTransactionsResult {
    transactions: Transactions
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
export type RemoveSession = () => Promise<Null>
export type ListSessions = () => Promise<ListSessionsResult>
export type GetTransaction = (
    params: GetTransactionParams
) => Promise<GetTransactionResult>
export type ListTransactions = () => Promise<ListTransactionsResult>
