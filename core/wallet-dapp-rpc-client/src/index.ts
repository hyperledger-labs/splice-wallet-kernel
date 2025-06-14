// Code generated by @open-rpc/generator DO NOT EDIT.
import {
    RequestManager,
    PostMessageWindowTransport,
    PostMessageIframeTransport,
    WebSocketTransport,
    HTTPTransport,
    Client,
    JSONRPCError,
} from '@open-rpc/client-js'
import _ from 'lodash'
import { OpenrpcDocument as OpenRPC, MethodObject } from '@open-rpc/meta-schema'
import {
    MethodCallValidator,
    MethodNotFoundError,
    parseOpenRPCDocument,
} from '@open-rpc/schema-utils-js'

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

export class SpliceWalletJSONRPCDAppAPI {
    public rpc: Client
    public static openrpcDocument: OpenRPC = {
        openrpc: '1.2.6',
        info: {
            title: 'Splice Wallet JSON-RPC dApp API',
            version: '1.0.0',
            description:
                'An OpenRPC specification for the dapp to interact with a wallet kernel.',
        },
        methods: [
            {
                name: 'connect',
                params: [],
                result: {
                    name: 'result',
                    schema: {
                        title: 'ConnectResult',
                        type: 'object',
                        properties: {
                            chainId: {
                                type: 'string',
                                description:
                                    "A CAIP-2 compliant chain ID, e.g. 'canton:da-mainnet'.",
                            },
                            userUrl: { $ref: '#/components/schemas/UserUrl' },
                        },
                        required: ['userUrl'],
                    },
                },
                description:
                    'Ensures ledger connectivity. Returns the current chainId if connected, or the user url if disconnected.',
            },
            {
                name: 'darsAvailable',
                params: [],
                result: {
                    name: 'result',
                    schema: {
                        title: 'darsAvailableResult',
                        type: 'object',
                        properties: {
                            dars: { type: 'array', items: { type: 'string' } },
                        },
                        required: ['dars'],
                    },
                },
                description:
                    'Lists DARs currently available on the connected Validator node.',
            },
            {
                name: 'prepareReturn',
                params: [
                    {
                        name: 'params',
                        schema: {
                            title: 'prepareReturnParams',
                            type: 'object',
                            properties: {
                                commands: {
                                    $ref: '#/components/schemas/JsCommands',
                                },
                            },
                            required: ['commands'],
                        },
                    },
                ],
                result: {
                    name: 'result',
                    schema: {
                        title: 'prepareReturnResult',
                        properties: {
                            response: {
                                $ref: '#/components/schemas/JsPrepareSubmissionResponse',
                            },
                        },
                        required: ['response'],
                    },
                },
                description:
                    'Processes the prepare step and returns the data to sign.',
            },
            {
                name: 'prepareExecute',
                params: [
                    {
                        name: 'params',
                        schema: {
                            title: 'prepareExecuteParams',
                            type: 'object',
                            properties: {
                                commands: {
                                    $ref: '#/components/schemas/JsCommands',
                                },
                            },
                            required: ['commands'],
                        },
                    },
                ],
                result: {
                    name: 'result',
                    schema: {
                        title: 'prepareExecuteResult',
                        properties: {
                            userUrl: { $ref: '#/components/schemas/UserUrl' },
                        },
                        required: ['userUrl'],
                    },
                },
                description: 'Prepares, signs, and executes a transaction.',
            },
            {
                name: 'ledgerApi',
                params: [
                    {
                        name: 'params',
                        schema: {
                            title: 'ledgerApiParams',
                            type: 'object',
                            properties: {
                                requestMethod: {
                                    type: 'string',
                                    enum: ['GET', 'POST', 'PUT', 'DELETE'],
                                },
                                resource: { type: 'string' },
                                body: { type: 'string' },
                            },
                            required: ['requestMethod', 'resource'],
                        },
                    },
                ],
                result: {
                    name: 'result',
                    schema: {
                        title: 'ledgerApiResult',
                        type: 'object',
                        properties: { response: { type: 'string' } },
                        required: ['response'],
                    },
                },
                description:
                    'Proxy for the JSON-API endpoints. Injects authorization headers automatically.',
            },
        ],
        components: {
            schemas: {
                Null: {
                    title: 'Null',
                    type: 'null',
                    description:
                        'Represents a null value, used in responses where no data is returned.',
                },
                UserUrl: {
                    title: 'UserUrl',
                    type: 'string',
                    format: 'uri',
                    description: 'A URL that points to a user interface.',
                },
                JsCommands: {
                    title: 'JsCommands',
                    type: 'object',
                    description:
                        'Structure representing JS commands for transaction execution',
                },
                JsPrepareSubmissionResponse: {
                    title: 'JsPrepareSubmissionResponse',
                    type: 'object',
                    description:
                        'Structure representing the result of a prepareReturn call',
                    properties: {
                        preparedTransaction: {
                            type: 'string',
                            description: 'The prepared transaction data.',
                        },
                        preparedTransactionHash: {
                            type: 'string',
                            description:
                                'The hash of the prepared transaction.',
                        },
                    },
                },
            },
        },
    }
    public dereffedDocument: OpenRPC | undefined
    public transport:
        | HTTPTransport
        | WebSocketTransport
        | PostMessageWindowTransport
        | PostMessageIframeTransport
    private validator: MethodCallValidator | undefined
    private timeout: number | undefined

    constructor(options: Options) {
        if (
            options.transport === undefined ||
            options.transport.type === undefined
        ) {
            throw new Error('Invalid constructor params')
        }
        const { type, host, port, protocol } = options.transport
        let path = options.transport.path || ''
        if (path && path[0] !== '/') {
            path = '/' + path
        }
        switch (type) {
            case 'http':
            case 'https':
                this.transport = new HTTPTransport(
                    (protocol || type) + '://' + host + ':' + port + path
                )
                break
            case 'websocket':
                this.transport = new WebSocketTransport(
                    (protocol || 'ws://') + host + ':' + port + path
                )
                break
            case 'postmessageiframe':
                this.transport = new PostMessageIframeTransport(
                    protocol + '://' + host + ':' + port + path
                )
                break
            case 'postmessagewindow':
                this.transport = new PostMessageWindowTransport(
                    protocol + '://' + host + ':' + port + path
                )
                break
            default:
                throw new Error('unsupported transport')
        }
        this.rpc = new Client(new RequestManager([this.transport]))
    }

    /**
     * Adds a JSONRPC notification handler to handle receiving notifications.
     * @example
     * myClient.onNotification((data)=>console.log(data));
     */
    private async initialize() {
        if (this.validator) {
            return
        }
        this.dereffedDocument = await parseOpenRPCDocument(
            SpliceWalletJSONRPCDAppAPI.openrpcDocument
        )
        this.validator = new MethodCallValidator(this.dereffedDocument)
    }

    /**
     * Adds a JSONRPC notification handler to handle receiving notifications.
     * @example
     * myClient.onNotification((data)=>console.log(data));
     */
    public onNotification(callback: (data: any) => void) {
        this.rpc.onNotification(callback)
    }

    /**
     * Adds an optional JSONRPCError handler to handle receiving errors that cannot be resolved to a specific request
     * @example
     * myClient.onError((err: JSONRPCError)=>console.log(err.message));
     */
    public onError(callback: (data: JSONRPCError) => void) {
        this.rpc.onError(callback)
    }

    /**
     * Sets a default timeout in ms for all requests excluding notifications.
     * @example
     * // 20s timeout
     * myClient.setDefaultTimeout(20000);
     * // Removes timeout from request
     * myClient.setDefaultTimeout(undefined);
     */
    public setDefaultTimeout(ms?: number) {
        this.timeout = ms
    }

    /**
     * Initiates [[SpliceWalletJSONRPCDAppAPI.startBatch]] in order to build a batch call.
     *
     * Subsequent calls to [[SpliceWalletJSONRPCDAppAPI.request]] will be added to the batch.
     * Once [[SpliceWalletJSONRPCDAppAPI.stopBatch]] is called, the promises for the [[SpliceWalletJSONRPCDAppAPI.request]]
     * will then be resolved.  If there is already a batch in progress this method is a noop.
     *
     * @example
     * myClient.startBatch();
     * myClient.foo().then(() => console.log("foobar"))
     * myClient.bar().then(() => console.log("foobarbaz"))
     * myClient.stopBatch();
     */
    public startBatch(): void {
        return this.rpc.startBatch()
    }

    /**
     * Initiates [[Client.stopBatch]] in order to finalize and send the batch to the underlying transport.
     *
     * stopBatch will send the [[SpliceWalletJSONRPCDAppAPI]] calls made since the last [[SpliceWalletJSONRPCDAppAPI.startBatch]] call. For
     * that reason, [[SpliceWalletJSONRPCDAppAPI.startBatch]] MUST be called before [[SpliceWalletJSONRPCDAppAPI.stopBatch]].
     *
     * @example
     * myClient.startBatch();
     * myClient.foo().then(() => console.log("foobar"))
     * myClient.bar().then(() => console.log("foobarbaz"))
     * myClient.stopBatch();
     */
    public stopBatch(): void {
        return this.rpc.stopBatch()
    }

    private async request(methodName: string, params: any[]): Promise<any> {
        await this.initialize()
        if (this.validator === undefined) {
            throw new Error('internal error')
        }
        const methodObject = _.find(
            SpliceWalletJSONRPCDAppAPI.openrpcDocument
                .methods as MethodObject[],
            ({ name }) => name === methodName
        ) as MethodObject
        const notification = methodObject.result ? false : true
        const openRpcMethodValidationErrors = this.validator.validate(
            methodName,
            params
        )
        if (
            openRpcMethodValidationErrors instanceof MethodNotFoundError ||
            openRpcMethodValidationErrors.length > 0
        ) {
            return Promise.reject(openRpcMethodValidationErrors)
        }

        let rpcParams
        if (
            methodObject.paramStructure &&
            methodObject.paramStructure === 'by-name'
        ) {
            rpcParams = _.zipObject(_.map(methodObject.params, 'name'), params)
        } else {
            rpcParams = params
        }
        if (notification) {
            return this.rpc.notify({ method: methodName, params: rpcParams })
        }
        return this.rpc.request(
            { method: methodName, params: rpcParams },
            this.timeout
        )
    }

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public connect: Connect = (...params) => {
        return this.request('connect', params)
    }

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public darsAvailable: DarsAvailable = (...params) => {
        return this.request('darsAvailable', params)
    }

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public prepareReturn: PrepareReturn = (...params) => {
        return this.request('prepareReturn', params)
    }

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public prepareExecute: PrepareExecute = (...params) => {
        return this.request('prepareExecute', params)
    }

    /**
     *
     */
    // tslint:disable-next-line:max-line-length
    public ledgerApi: LedgerApi = (...params) => {
        return this.request('ledgerApi', params)
    }
}
export default SpliceWalletJSONRPCDAppAPI
