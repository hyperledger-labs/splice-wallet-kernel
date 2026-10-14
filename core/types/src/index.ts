// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

export * from './crypto.js'

/**
 * Logger
 */
export type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>

// This creates a "branded type" since AccessToken is an alias for string,
// but we don't want it to be interchangeable with a regular string.
// declare const AccessTokenBrand: unique symbol
// export type AccessToken = string & {
//     readonly [AccessTokenBrand]: typeof AccessTokenBrand
// }
export type AccessToken = string

export const PARTY_ID_EXAMPLE = 'party-hint::fingerprint'
export const PARTY_ID_ERROR_MESSAGE = `Must be in the form ${PARTY_ID_EXAMPLE}`
export const PARTY_ID_PATTERN = /^[a-zA-Z0-9:_-]*::[a-z0-9]*/

export const PartyId = z
    .string()
    .regex(PARTY_ID_PATTERN, PARTY_ID_ERROR_MESSAGE)

export type PartyId = z.infer<typeof PartyId>

export const HttpUrl = z
    .url({
        message: 'Must be a valid HTTP or HTTPS URL',
        protocol: /^https?$/,
    })
    .transform((value) => new URL(value).toString())

export type HttpUrl = z.infer<typeof HttpUrl>

/**
 *  Requests / responses
 */
export const RequestPayload = z.object({
    method: z.string(),
    params: z.optional(
        z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())])
    ),
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
    SPLICE_WALLET_LOGOUT = 'SPLICE_WALLET_LOGOUT',
    // Other
    SPLICE_WALLET_BROADCAST_ORIGIN = 'SPLICE_WALLET_BROADCAST_ORIGIN', // Used by the dApp (parent) to broadcast its origin down to the wallet (child) for cross-origin communication
    SPLICE_WALLET_BROADCAST_ORIGIN_ACK = 'SPLICE_WALLET_BROADCAST_ORIGIN_ACK', // Used by the wallet (child) to acknowledge receipt of the dApp's origin for cross-origin communication
}

export type SpliceMessageEvent = MessageEvent<SpliceMessage>

const SpliceTarget = z
    .string()
    .min(1)
    .describe(
        'Optional routing key for browser-extension messaging. When present, only the matching extension should handle the message.'
    )

export const SpliceMessage = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_REQUEST),
        request: JsonRpcRequest,
        target: SpliceTarget.optional(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_RESPONSE),
        response: JsonRpcResponse,
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_EXT_READY),
        target: SpliceTarget.optional(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_EXT_ACK),
        target: SpliceTarget.optional(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_EXT_OPEN),
        url: z.url(),
        target: SpliceTarget.optional(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS),
        token: z.string(),
        sessionId: z.string(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_BROADCAST_ORIGIN),
        origin: z.url(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_BROADCAST_ORIGIN_ACK),
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
        /** Matches {@link ProviderId} from discovery (e.g. `browser:canton`) for session restore. */
        providerId: z.string().optional(),
        url: z.optional(z.never()),
    }),
    z.object({
        walletType: z.literal('remote'),
        url: z.string().url(),
    }),
])

export type DiscoverResult = z.infer<typeof DiscoverResult>

/**
 * Provider adapter configuration
 */
export const ProviderAdapterConfig = z.object({
    name: z.string(),
})

export type ProviderAdapterConfig = z.infer<typeof ProviderAdapterConfig>

/**
 * Wallet picker entry and result
 */
export type BrowserPlatform = 'chrome' | 'firefox'

export interface WalletPickerEntry {
    providerId: string
    name: string
    type: string
    description?: string | undefined
    icon?: string | undefined
    url?: string | undefined
    /** Keep the global wallet popup open after pick for async HTTP-gateway navigation. */
    reuseGlobalWalletPopup?: boolean | undefined
}

export interface WalletPickerSuggestedEntry extends Omit<
    WalletPickerEntry,
    'url' | 'reuseGlobalWalletPopup'
> {
    installUrls: { platform: BrowserPlatform; url: string }[]
}

export interface WalletPickerResult {
    providerId: string
    name: string
    type: string
    url?: string | undefined
    reuseGlobalWalletPopup?: boolean | undefined
}

// RPC related types

export type UnknownRpcTypes = {
    [method: string]: {
        params: unknown
        result: unknown
    }
}

// RequestPayload is used at the transport layer, and encompasses wider types
// RequestArgs is used at the provider/client layer, and is more strictly typed based on the RpcTypes of the client
export type RequestArgs<
    T extends UnknownRpcTypes,
    M extends keyof T,
> = M extends keyof T
    ? T[M]['params'] extends never
        ? { method: M }
        : { method: M; params: T[M]['params'] }
    : never

export enum WALLET_DISABLED_REASON {
    NO_SIGNING_PROVIDER_MATCHED = 'no signing provider matched',
    // Used for participant wallets if participant node got reset, and now has a different namespace than the internal party.
    PARTICIPANT_NAMESPACE_CHANGED = 'participant namespace changed',
    TOPOLOGY_TRANSACTION_FAILED = 'topology transaction failed',
    TOPOLOGY_TRANSACTION_REJECTED = 'topology transaction rejected',
    TOPOLOGY_TRANSACTION_PENDING = 'topology transaction pending',
}

/**
 * Provider discovery events (EIP-6963-shaped).
 *
 * These are dispatched on `window`:
 * - dApp → wallets/extensions: request
 * - wallets/extensions → dApp: announce
 */
export const CANTON_REQUEST_PROVIDER_EVENT = 'canton:requestProvider' as const
export const CANTON_ANNOUNCE_PROVIDER_EVENT = 'canton:announceProvider' as const

export type {
    ContractId,
    Party,
    Time,
    Date,
    Numeric,
    Int,
    Map,
    Optional,
    Serializable,
} from '@daml/types'
