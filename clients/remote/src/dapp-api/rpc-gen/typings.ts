export type StringDoaGddGA = string
/**
 *
 * Structure representing JS commands for transaction execution
 *
 */
export interface JsCommands {
    [key: string]: any
}
export type StringMo3KZIJp = 'GET' | 'POST' | 'PUT' | 'DELETE'
/**
 *
 * CAIP-2 compliant chain ID, e.g. 'canton:da-mainnet'
 *
 */
export type StringYkM1EZ9K = string
export type UnorderedSetOfStringDoaGddGADvj0XlFa = StringDoaGddGA[]
export interface AddNetworkParams {
    [key: string]: any
}
export interface AllocatePartyParams {
    hint: StringDoaGddGA
    [k: string]: any
}
export interface RemovePartyParams {
    hint: StringDoaGddGA
    [k: string]: any
}
export interface SignParams {
    data: StringDoaGddGA
    party?: StringDoaGddGA
    [k: string]: any
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
    requestMethod: StringMo3KZIJp
    resource: StringDoaGddGA
    body?: StringDoaGddGA
    [k: string]: any
}
export interface ConnectResult {
    chainId: StringYkM1EZ9K
    [k: string]: any
}
/**
 *
 * Represents a null value, used in responses where no data is returned.
 *
 */
export type Null = null
export interface AllocatePartyResult {
    [key: string]: any
}
export interface RemovePartyResult {
    [key: string]: any
}
export interface SignResult {
    signature: StringDoaGddGA
    party: StringDoaGddGA
    signedBy: StringDoaGddGA
    [k: string]: any
}
/**
 *
 * Structure representing the result of a prepareReturn call
 *
 */
export interface JsPrepareSubmissionResponse {
    [key: string]: any
}
export interface LedgerApiResult {
    response: StringDoaGddGA
    [k: string]: any
}
export interface DarsAvailableResult {
    dars: UnorderedSetOfStringDoaGddGADvj0XlFa
    [k: string]: any
}
/**
 *
 * Generated! Represents an alias to any of the provided schemas
 *
 */
export type AnyOfAddNetworkParamsAllocatePartyParamsRemovePartyParamsSignParamsPrepareReturnParamsPrepareExecuteParamsLedgerApiParamsConnectResultNullAllocatePartyResultRemovePartyResultSignResultJsPrepareSubmissionResponseNullLedgerApiResultDarsAvailableResult =

        | AddNetworkParams
        | AllocatePartyParams
        | RemovePartyParams
        | SignParams
        | PrepareReturnParams
        | PrepareExecuteParams
        | LedgerApiParams
        | ConnectResult
        | Null
        | AllocatePartyResult
        | RemovePartyResult
        | SignResult
        | JsPrepareSubmissionResponse
        | LedgerApiResult
        | DarsAvailableResult
export type Connect = () => Promise<ConnectResult>
export type AddNetwork = (network: AddNetworkParams) => Promise<Null>
export type AllocateParty = (
    params: AllocatePartyParams
) => Promise<AllocatePartyResult>
export type RemoveParty = (
    params: RemovePartyParams
) => Promise<RemovePartyResult>
export type Sign = (params: SignParams) => Promise<SignResult>
export type PrepareReturn = (
    params: PrepareReturnParams
) => Promise<JsPrepareSubmissionResponse>
export type PrepareExecute = (params: PrepareExecuteParams) => Promise<Null>
export type LedgerApi = (params: LedgerApiParams) => Promise<LedgerApiResult>
export type DarsAvailable = () => Promise<DarsAvailableResult>
