// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 *
 * Structure representing JS commands for transaction execution
 *
 */
export interface JsCommands {
    [key: string]: any
}
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type Resource = string
export type Body = string
/**
 *
 * The unique identifier of the Wallet Gateway.
 *
 */
export type Id = string
/**
 *
 * The type of client that implements the Wallet Gateway.
 *
 */
export type ClientType = 'browser' | 'desktop' | 'mobile' | 'remote'
/**
 *
 * The URL of the Wallet Gateway.
 *
 */
export type Url = string
/**
 *
 * A URL that points to a user interface.
 *
 */
export type UserUrl = string
/**
 *
 * Represents a Wallet Gateway.
 *
 */
export interface KernelInfo {
    id: Id
    clientType: ClientType
    url?: Url
    userUrl?: UserUrl
    [k: string]: any
}
/**
 *
 * Whether or not a connection to a network is esablished.
 *
 */
export type IsConnected = boolean
/**
 *
 * The network ID the wallet corresponds to.
 *
 */
export type ChainId = string
/**
 *
 * JWT authentication token (if applicable).
 *
 */
export type SessionToken = string
export type Dar = string
export type Dars = Dar[]
/**
 *
 * The prepared transaction data.
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
 * Structure representing the result of a prepareReturn call
 *
 */
export interface JsPrepareSubmissionResponse {
    preparedTransaction?: PreparedTransaction
    preparedTransactionHash?: PreparedTransactionHash
    [k: string]: any
}
/**
 *
 * The status of the transaction.
 *
 */
export type StatusExecuted = 'executed'
/**
 *
 * The unique identifier of the command associated with the transaction.
 *
 */
export type CommandId = string
/**
 *
 * The update ID corresponding to the transaction.
 *
 */
export type UpdateId = string
export type CompletionOffset = number
/**
 *
 * Payload for the TxChangedExecutedEvent.
 *
 */
export interface TxChangedExecutedPayload {
    updateId: UpdateId
    completionOffset: CompletionOffset
}
/**
 *
 * Event emitted when a transaction is executed against the participant.
 *
 */
export interface TxChangedExecutedEvent {
    status: StatusExecuted
    commandId: CommandId
    payload: TxChangedExecutedPayload
}
export interface Response {
    [key: string]: any
}
/**
 *
 * Set as primary wallet for dApp usage.
 *
 */
export type Primary = boolean
/**
 *
 * The party ID corresponding to the wallet.
 *
 */
export type PartyId = string
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
 * The signing provider ID the wallet corresponds to.
 *
 */
export type SigningProviderId = string
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
    chainId: ChainId
    signingProviderId: SigningProviderId
    [k: string]: any
}
/**
 *
 * The status of the transaction.
 *
 */
export type StatusPending = 'pending'
/**
 *
 * Event emitted when a transaction is pending.
 *
 */
export interface TxChangedPendingEvent {
    status: StatusPending
    commandId: CommandId
}
/**
 *
 * The status of the transaction.
 *
 */
export type StatusSigned = 'signed'
/**
 *
 * The signature of the transaction.
 *
 */
export type Signature = string
/**
 *
 * The identifier of the provider that signed the transaction.
 *
 */
export type SignedBy = string
/**
 *
 * The party that signed the transaction.
 *
 */
export type Party = string
/**
 *
 * Payload for the TxChangedSignedEvent.
 *
 */
export interface TxChangedSignedPayload {
    signature: Signature
    signedBy: SignedBy
    party: Party
}
/**
 *
 * Event emitted when a transaction has been signed.
 *
 */
export interface TxChangedSignedEvent {
    status: StatusSigned
    commandId: CommandId
    payload: TxChangedSignedPayload
}
/**
 *
 * The status of the transaction.
 *
 */
export type StatusFailed = 'failed'
/**
 *
 * Event emitted when a transaction has failed.
 *
 */
export interface TxChangedFailedEvent {
    status: StatusFailed
    commandId: CommandId
}
export interface PrepareReturnParams {
    commands: JsCommands
    [k: string]: any
}
export interface PrepareExecuteParams {
    commands: JsCommands
    [k: string]: any
}
export interface LedgerApiParams {
    requestMethod: RequestMethod
    resource: Resource
    body?: Body
    [k: string]: any
}
export interface StatusResult {
    kernel: KernelInfo
    isConnected: IsConnected
    chainId?: ChainId
    [k: string]: any
}
export interface ConnectResult {
    kernel: KernelInfo
    isConnected: IsConnected
    chainId?: ChainId
    sessionToken: SessionToken
    [k: string]: any
}
export interface DarsAvailableResult {
    dars: Dars
    [k: string]: any
}
export type PrepareReturnResult = any
export interface PrepareExecuteResult {
    tx: TxChangedExecutedEvent
    [k: string]: any
}
/**
 *
 * Ledger Api configuration options
 *
 */
export interface LedgerApiResult {
    response: Response
    [k: string]: any
}
/**
 *
 * Event emitted when the user's accounts change.
 *
 */
export type AccountsChangedEvent = Wallet[]
/**
 *
 * An array of accounts that the user has authorized the dapp to access..
 *
 */
export type RequestAccountsResult = Wallet[]
/**
 *
 * Event emitted when a transaction changes.
 *
 */
export type TxChangedEvent =
    | TxChangedPendingEvent
    | TxChangedSignedEvent
    | TxChangedExecutedEvent
    | TxChangedFailedEvent
/**
 *
 * Generated! Represents an alias to any of the provided schemas
 *
 */

export type Status = () => Promise<StatusResult>
export type Connect = () => Promise<ConnectResult>
export type DarsAvailable = () => Promise<DarsAvailableResult>
export type PrepareReturn = (
    params: PrepareReturnParams
) => Promise<PrepareReturnResult>
export type PrepareExecute = (
    params: PrepareExecuteParams
) => Promise<PrepareExecuteResult>
export type LedgerApi = (params: LedgerApiParams) => Promise<LedgerApiResult>
export type OnAccountsChanged = () => Promise<AccountsChangedEvent>
export type RequestAccounts = () => Promise<RequestAccountsResult>
export type OnTxChanged = () => Promise<TxChangedEvent>
