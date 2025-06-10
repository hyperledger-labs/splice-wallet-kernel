import {
    PostMessageWindowTransport,
    PostMessageIframeTransport,
    WebSocketTransport,
    HTTPTransport,
    Client,
    JSONRPCError,
} from '@open-rpc/client-js'
import { OpenrpcDocument as OpenRPC } from '@open-rpc/meta-schema'
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
export interface LedgerApiResult {
    response: StringDoaGddGA
    [k: string]: any
}
/**
 *
 * Generated! Represents an alias to any of the provided schemas
 *
 */
export type AnyOfPrepareReturnParamsPrepareExecuteParamsLedgerApiParamsConnectResultDarsAvailableResultPrepareReturnResultPrepareExecuteResultLedgerApiResult =

        | PrepareReturnParams
        | PrepareExecuteParams
        | LedgerApiParams
        | ConnectResult
        | DarsAvailableResult
        | PrepareReturnResult
        | PrepareExecuteResult
        | LedgerApiResult
export type Connect = () => Promise<ConnectResult>
export type DarsAvailable = () => Promise<DarsAvailableResult>
export type PrepareReturn = (
    params: PrepareReturnParams
) => Promise<PrepareReturnResult>
export type PrepareExecute = (
    params: PrepareExecuteParams
) => Promise<PrepareExecuteResult>
export type LedgerApi = (params: LedgerApiParams) => Promise<LedgerApiResult>
export interface Options {
    transport: {
        type:
            | 'websocket'
            | 'http'
            | 'https'
            | 'postmessagewindow'
            | 'postmessageiframe'
        host: string
        port: number
        path?: string
        protocol?: string
    }
}
export declare class WalletJSONRPCDAppAPI {
    rpc: Client
    static openrpcDocument: OpenRPC
    dereffedDocument: OpenRPC | undefined
    transport:
        | HTTPTransport
        | WebSocketTransport
        | PostMessageWindowTransport
        | PostMessageIframeTransport
    private validator
    private timeout
    constructor(options: Options)
    /**
     * Adds a JSONRPC notification handler to handle receiving notifications.
     * @example
     * myClient.onNotification((data)=>console.log(data));
     */
    private initialize
    /**
     * Adds a JSONRPC notification handler to handle receiving notifications.
     * @example
     * myClient.onNotification((data)=>console.log(data));
     */
    onNotification(callback: (data: any) => void): void
    /**
     * Adds an optional JSONRPCError handler to handle receiving errors that cannot be resolved to a specific request
     * @example
     * myClient.onError((err: JSONRPCError)=>console.log(err.message));
     */
    onError(callback: (data: JSONRPCError) => void): void
    /**
     * Sets a default timeout in ms for all requests excluding notifications.
     * @example
     * // 20s timeout
     * myClient.setDefaultTimeout(20000);
     * // Removes timeout from request
     * myClient.setDefaultTimeout(undefined);
     */
    setDefaultTimeout(ms?: number): void
    /**
     * Initiates [[WalletJSONRPCDAppAPI.startBatch]] in order to build a batch call.
     *
     * Subsequent calls to [[WalletJSONRPCDAppAPI.request]] will be added to the batch.
     * Once [[WalletJSONRPCDAppAPI.stopBatch]] is called, the promises for the [[WalletJSONRPCDAppAPI.request]]
     * will then be resolved.  If there is already a batch in progress this method is a noop.
     *
     * @example
     * myClient.startBatch();
     * myClient.foo().then(() => console.log("foobar"))
     * myClient.bar().then(() => console.log("foobarbaz"))
     * myClient.stopBatch();
     */
    startBatch(): void
    /**
     * Initiates [[Client.stopBatch]] in order to finalize and send the batch to the underlying transport.
     *
     * stopBatch will send the [[WalletJSONRPCDAppAPI]] calls made since the last [[WalletJSONRPCDAppAPI.startBatch]] call. For
     * that reason, [[WalletJSONRPCDAppAPI.startBatch]] MUST be called before [[WalletJSONRPCDAppAPI.stopBatch]].
     *
     * @example
     * myClient.startBatch();
     * myClient.foo().then(() => console.log("foobar"))
     * myClient.bar().then(() => console.log("foobarbaz"))
     * myClient.stopBatch();
     */
    stopBatch(): void
    private request
    /**
     *
     */
    connect: Connect
    /**
     *
     */
    darsAvailable: DarsAvailable
    /**
     *
     */
    prepareReturn: PrepareReturn
    /**
     *
     */
    prepareExecute: PrepareExecute
    /**
     *
     */
    ledgerApi: LedgerApi
}
export default WalletJSONRPCDAppAPI
