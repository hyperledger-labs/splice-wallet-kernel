// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 *
 * The unique identifier of the command associated with the transaction.
 *
 */
export type CommandId = string
/**
 *
 * Structure representing JS commands for transaction execution
 *
 */
export interface JsCommands {
    [key: string]: any
}
/**
 *
 * The party that signed the transaction.
 *
 */
export type Party = string
/**
 *
 * Set of parties on whose behalf the command should be executed, if submitted. If not set, the primary wallet's party is used.
 *
 */
export type ActAs = Party[]
/**
 *
 * Set of parties that should be granted read access to the command, if submitted. If not set, no additional read parties are granted.
 *
 */
export type ReadAs = Party[]
/**
 *
 * The template identifier of the disclosed contract.
 *
 */
export type TemplateId = string
/**
 *
 * The unique identifier of the disclosed contract.
 *
 */
export type ContractId = string
/**
 *
 * The blob data of the created event for the disclosed contract.
 *
 */
export type CreatedEventBlob = string
/**
 *
 * If not set, a suitable synchronizer that this node is connected to will be chosen.
 *
 */
export type SynchronizerId = string
/**
 *
 * Structure representing a disclosed contract for transaction execution
 *
 */
export interface DisclosedContract {
    templateId?: TemplateId
    contractId?: ContractId
    createdEventBlob: CreatedEventBlob
    synchronizerId?: SynchronizerId
    [k: string]: any
}
/**
 *
 * List of contract IDs to be disclosed with the command.
 *
 */
export type DisclosedContracts = DisclosedContract[]
export type PackageId = string
/**
 *
 * The package-id selection preference of the client for resolving package names and interface instances in command submission and interpretation
 *
 */
export type PackageIdSelectionPreference = PackageId[]
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
 * Whether or not the user is authenticated with the Wallet.
 *
 */
export type IsConnected = boolean
/**
 *
 * Whether or not a connection to a network is established.
 *
 */
export type IsNetworkConnected = boolean
/**
 *
 * If not connected to a network, the reason why.
 *
 */
export type NetworkReason = string
/**
 *
 * The network ID the wallet corresponds to.
 *
 */
export type NetworkId = string
/**
 *
 * The base URL of the ledger API.
 *
 */
export type BaseUrl = string
/**
 *
 * Ledger API configuration.
 *
 */
export interface LedgerApiConfig {
    baseUrl: BaseUrl
    [k: string]: any
}
/**
 *
 * Network information, if connected to a network.
 *
 */
export interface Network {
    networkId: NetworkId
    ledgerApi?: LedgerApiConfig
    [k: string]: any
}
/**
 *
 * JWT authentication token.
 *
 */
export type AccessToken = string
/**
 *
 * The user identifier.
 *
 */
export type UserId = string
/**
 *
 * Session information, if authenticated.
 *
 */
export interface Session {
    accessToken: AccessToken
    userId: UserId
    [k: string]: any
}
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
export type Response = string
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
/**
 *
 * Structure representing the request for prepare and execute calls
 *
 */
export interface PrepareReturnParams {
    commandId?: CommandId
    commands: JsCommands
    actAs?: ActAs
    readAs?: ReadAs
    disclosedContracts?: DisclosedContracts
    synchronizerId?: SynchronizerId
    packageIdSelectionPreference?: PackageIdSelectionPreference
    [k: string]: any
}
/**
 *
 * Structure representing the request for prepare and execute calls
 *
 */
export interface PrepareExecuteParams {
    commandId?: CommandId
    commands: JsCommands
    actAs?: ActAs
    readAs?: ReadAs
    disclosedContracts?: DisclosedContracts
    synchronizerId?: SynchronizerId
    packageIdSelectionPreference?: PackageIdSelectionPreference
    [k: string]: any
}
/**
 *
 * Ledger API request structure
 *
 */
export interface LedgerApiParams {
    requestMethod: RequestMethod
    resource: Resource
    body?: Body
    [k: string]: any
}
export interface StatusEvent {
    kernel: KernelInfo
    isConnected: IsConnected
    isNetworkConnected: IsNetworkConnected
    networkReason?: NetworkReason
    userUrl?: UserUrl
    network?: Network
    session?: Session
    [k: string]: any
}
/**
 *
 * Represents a null value, used in responses where no data is returned.
 *
 */
export type Null = null
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

export type Status = () => Promise<StatusEvent>
export type Connect = () => Promise<StatusEvent>
export type Disconnect = () => Promise<Null>
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
