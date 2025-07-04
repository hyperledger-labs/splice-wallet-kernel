// Code generated by @open-rpc/generator DO NOT EDIT.
import _ from 'lodash'

import { RequestPayload, RpcTransport } from 'core-types'

/**
 *
 * Structure representing JS commands for transaction execution
 *
 */
export interface JsCommands {
    [key: string]: any
}
export type StringMo3KZIJp = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type StringDoaGddGA = string
/**
 *
 * The unique identifier of the wallet kernel.
 *
 */
export type StringFRWQxn2U = string
/**
 *
 * The type of client that implements the wallet kernel.
 *
 */
export type String1W6CJDXN = 'browser' | 'desktop' | 'mobile' | 'remote'
/**
 *
 * The URL of the wallet kernel.
 *
 */
export type String3T7JhIFf = string
/**
 *
 * Represents a wallet kernel.
 *
 */
export interface KernelInfo {
    id: StringFRWQxn2U
    clientType: String1W6CJDXN
    url?: String3T7JhIFf
    [k: string]: any
}
/**
 *
 * Whether or not a connection to a network is esablished.
 *
 */
export type BooleanIJuPLvlB = boolean
/**
 *
 * A CAIP-2 compliant chain ID, e.g. 'canton:da-mainnet'.
 *
 */
export type StringIUsSEQ9O = string
/**
 *
 * A URL that points to a user interface.
 *
 */
export type UserUrl = string
export type UnorderedSetOfStringDoaGddGADvj0XlFa = StringDoaGddGA[]
/**
 *
 * The prepared transaction data.
 *
 */
export type StringVxX3QAKl = string
/**
 *
 * The hash of the prepared transaction.
 *
 */
export type StringZK0Xb1WV = string
/**
 *
 * Structure representing the result of a prepareReturn call
 *
 */
export interface JsPrepareSubmissionResponse {
    preparedTransaction?: StringVxX3QAKl
    preparedTransactionHash?: StringZK0Xb1WV
    [k: string]: any
}
/**
 *
 * JWT authentication token (if applicable).
 *
 */
export type String8FT98W8N = string
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
export interface StatusResult {
    kernel: KernelInfo
    isConnected: BooleanIJuPLvlB
    chainId?: StringIUsSEQ9O
    [k: string]: any
}
export interface ConnectResult {
    kernel: KernelInfo
    isConnected: BooleanIJuPLvlB
    chainId?: StringIUsSEQ9O
    userUrl: UserUrl
    [k: string]: any
}
export interface DarsAvailableResult {
    dars: UnorderedSetOfStringDoaGddGADvj0XlFa
    [k: string]: any
}
export type PrepareReturnResult = any
export type PrepareExecuteResult = any
/**
 *
 * Ledger Api configuration options
 *
 */
export interface LedgerApiResult {
    response: StringDoaGddGA
    [k: string]: any
}
export interface OnConnectedEvent {
    kernel: KernelInfo
    chainId: StringIUsSEQ9O
    sessionToken?: String8FT98W8N
    [k: string]: any
}
/**
 *
 * Generated! Represents an alias to any of the provided schemas
 *
 */
export type AnyOfPrepareReturnParamsPrepareExecuteParamsLedgerApiParamsStatusResultConnectResultDarsAvailableResultPrepareReturnResultPrepareExecuteResultLedgerApiResultOnConnectedEvent =

        | PrepareReturnParams
        | PrepareExecuteParams
        | LedgerApiParams
        | StatusResult
        | ConnectResult
        | DarsAvailableResult
        | PrepareReturnResult
        | PrepareExecuteResult
        | LedgerApiResult
        | OnConnectedEvent
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
export type OnConnected = () => Promise<OnConnectedEvent>

export class SpliceWalletJSONRPCDAppAPI {
    public transport: RpcTransport

    constructor(transport: RpcTransport) {
        this.transport = transport
    }

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'status',
        ...params: Parameters<Status>
    ): ReturnType<Status>

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'connect',
        ...params: Parameters<Connect>
    ): ReturnType<Connect>

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'darsAvailable',
        ...params: Parameters<DarsAvailable>
    ): ReturnType<DarsAvailable>

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'prepareReturn',
        ...params: Parameters<PrepareReturn>
    ): ReturnType<PrepareReturn>

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'prepareExecute',
        ...params: Parameters<PrepareExecute>
    ): ReturnType<PrepareExecute>

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'ledgerApi',
        ...params: Parameters<LedgerApi>
    ): ReturnType<LedgerApi>

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public async request(
        method: 'onConnected',
        ...params: Parameters<OnConnected>
    ): ReturnType<OnConnected>

    public async request(
        method: string,
        params?: RequestPayload['params']
    ): Promise<unknown> {
        const response = await this.transport.submit({ method, params })

        if ('error' in response) {
            throw new Error(
                'RPC error: ' +
                    response.error.code +
                    ' - ' +
                    response.error.message
            )
        } else {
            return response.result
        }
    }
}
export default SpliceWalletJSONRPCDAppAPI
