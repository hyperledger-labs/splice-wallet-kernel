import { z } from 'zod'

/**
 *  Requests / responses
 */
export const RequestPayload = z.object({
    method: z.string(),
    params: z.optional(z.union([z.array(z.unknown()), z.record(z.unknown())])),
})
export type RequestPayload = z.infer<typeof RequestPayload>

export const SuccessResponse = z.object({
    result: z.optional(z.unknown()),
})
export type SuccessResponse = z.infer<typeof SuccessResponse>

export const ErrorResponse = z.object({
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.optional(
            z
                .string()
                .or(z.number())
                .or(z.boolean())
                .or(z.null())
                .or(z.unknown())
        ),
    }),
})
export type ErrorResponse = z.infer<typeof ErrorResponse>

export const ResponsePayload = z.union([SuccessResponse, ErrorResponse])
export type ResponsePayload = z.infer<typeof ResponsePayload>

/**
 * JSON RPC
 */
export const JsonRpcMeta = z.object({
    jsonrpc: z.literal('2.0'), // only support JSON-RPC 2.0
    id: z.optional(z.string().or(z.number()).or(z.undefined()).or(z.null())),
})
export type JsonRpcMeta = z.infer<typeof JsonRpcMeta>

export const JsonRpcRequest = z.intersection(JsonRpcMeta, RequestPayload)
export type JsonRpcRequest = z.infer<typeof JsonRpcRequest>

export const JsonRpcResponse = z.intersection(JsonRpcMeta, ResponsePayload)
export type JsonRpcResponse = z.infer<typeof JsonRpcResponse>

/**
 * Window / message events
 */
export enum WalletEvent {
    // JSON-RPC related events
    SPLICE_WALLET_REQUEST = 'SPLICE_WALLET_REQUEST',
    SPLICE_WALLET_RESPONSE = 'SPLICE_WALLET_RESPONSE',
    // Browser extension related events
    SPLICE_WALLET_EXT_READY = 'SPLICE_WALLET_EXT_READY', // A request from the dApp to the browser extension to see if its loaded
    SPLICE_WALLET_EXT_ACK = 'SPLICE_WALLET_EXT_ACK', // A response from the extension back to the dapp to acknowledge readiness
    SPLICE_WALLET_EXT_OPEN = 'SPLICE_WALLET_EXT_OPEN', // A request from the dApp to the browser extension to open the wallet UI
    // Auth events
    SPLICE_WALLET_IDP_AUTH_SUCCESS = 'SPLICE_WALLET_IDP_AUTH_SUCCESS',
}

export interface SpliceMessageEvent extends MessageEvent {
    data: SpliceMessage
}

export const SpliceMessage = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_REQUEST),
        request: JsonRpcRequest,
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_RESPONSE),
        response: JsonRpcResponse,
    }),
    z.object({ type: z.literal(WalletEvent.SPLICE_WALLET_EXT_READY) }),
    z.object({ type: z.literal(WalletEvent.SPLICE_WALLET_EXT_ACK) }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_EXT_OPEN),
        url: z.string().url(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS),
        token: z.string(),
    }),
])
export type SpliceMessage = z.infer<typeof SpliceMessage>

export const isSpliceMessageEvent = (
    event: unknown
): event is SpliceMessageEvent => {
    if (typeof event === 'object' && event !== null && 'data' in event) {
        return isSpliceMessage(event.data)
    } else {
        return false
    }
}

export const isSpliceMessage = (message: unknown): message is SpliceMessage => {
    return SpliceMessage.safeParse(message).success
}

/**
 * SDK types
 */
export const DiscoverResult = z.discriminatedUnion('walletType', [
    z.object({
        walletType: z.literal('extension'),
        url: z.optional(z.never()),
        sessionToken: z.optional(z.string()),
    }),
    z.object({
        walletType: z.literal('remote'),
        url: z.string().url(),
        sessionToken: z.optional(z.string()),
    }),
])

export type DiscoverResult = z.infer<typeof DiscoverResult>

export interface RpcTransport {
    submit: (payload: RequestPayload) => Promise<ResponsePayload>
}
