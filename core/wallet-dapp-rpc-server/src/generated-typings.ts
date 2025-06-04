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
export interface ConnectResponse {
    chainId: StringYkM1EZ9K
    [k: string]: any
}
/**
 *
 * A response that contains no data.
 *
 */
export type Null = null
export interface AllocatePartyResponse {
    [key: string]: any
}
export interface RemovePartyResponse {
    [key: string]: any
}
export interface SignResponse {
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
export interface LedgerApiResponse {
    response: StringDoaGddGA
    [k: string]: any
}
export interface DarsAvailableResponse {
    dars: UnorderedSetOfStringDoaGddGADvj0XlFa
    [k: string]: any
}
/**
 *
 * Generated! Represents an alias to any of the provided schemas
 *
 */
export type AnyOfAddNetworkParamsAllocatePartyParamsRemovePartyParamsSignParamsPrepareReturnParamsPrepareExecuteParamsLedgerApiParamsConnectResponseNullAllocatePartyResponseRemovePartyResponseSignResponseJsPrepareSubmissionResponseNullLedgerApiResponseDarsAvailableResponse =

        | AddNetworkParams
        | AllocatePartyParams
        | RemovePartyParams
        | SignParams
        | PrepareReturnParams
        | PrepareExecuteParams
        | LedgerApiParams
        | ConnectResponse
        | Null
        | AllocatePartyResponse
        | RemovePartyResponse
        | SignResponse
        | JsPrepareSubmissionResponse
        | LedgerApiResponse
        | DarsAvailableResponse
export type Connect = () => Promise<ConnectResponse>
export type AddNetwork = (network: AddNetworkParams) => Promise<Null>
export type AllocateParty = (
    params: AllocatePartyParams
) => Promise<AllocatePartyResponse>
export type RemoveParty = (
    params: RemovePartyParams
) => Promise<RemovePartyResponse>
export type Sign = (params: SignParams) => Promise<SignResponse>
export type PrepareReturn = (
    params: PrepareReturnParams
) => Promise<JsPrepareSubmissionResponse>
export type PrepareExecute = (params: PrepareExecuteParams) => Promise<Null>
export type LedgerApi = (params: LedgerApiParams) => Promise<LedgerApiResponse>
export type DarsAvailable = () => Promise<DarsAvailableResponse>
