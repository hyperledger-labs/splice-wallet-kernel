import { z } from 'zod'

/**
 *  Requests / responses
 */
export const RequestPayload = z.object({
    method: z.string(),
    params: z.optional(z.union([z.array(z.unknown()), z.record(z.unknown())])),
})
export type RequestPayload = z.infer<typeof RequestPayload>

const SuccessResponse = z.object({
    result: z.optional(z.unknown()),
})

const ErrorResponse = z.object({
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.optional(
            z.string().or(z.number()).or(z.boolean()).or(z.null())
        ),
    }),
})

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
    SPLICE_WALLET_REQUEST = 'SPLICE_WALLET_REQUEST',
    SPLICE_WALLET_RESPONSE = 'SPLICE_WALLET_RESPONSE',
    SPLICE_WALLET_EXTENSION_READY = 'SPLICE_WALLET_EXTENSION_READY',
}

export interface SpliceMessageEvent extends MessageEvent {
    data: SpliceMessage
}

export const SpliceMessage = z.discriminatedUnion('type', [
    z.object({ type: z.literal(WalletEvent.SPLICE_WALLET_EXTENSION_READY) }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_REQUEST),
        request: JsonRpcRequest,
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_RESPONSE),
        response: JsonRpcResponse,
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
export const DiscoverResult = z.object({
    walletType: z.enum(['extension', 'remote']),
    url: z.string().url(),
})
export type DiscoverResult = z.infer<typeof DiscoverResult>
