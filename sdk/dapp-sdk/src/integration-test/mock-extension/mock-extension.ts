// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    CANTON_ANNOUNCE_PROVIDER_EVENT,
    CANTON_REQUEST_PROVIDER_EVENT,
    WalletEvent,
    isSpliceMessageEvent,
    type SpliceMessage,
} from '@canton-network/core-types'
import type {
    ConnectResult,
    ListAccountsResult,
    StatusEvent,
    Wallet,
} from '@canton-network/core-wallet-dapp-rpc-client'

export const MOCK_EXTENSION_TARGET = 'mock-splice-extension'
export const MOCK_EXTENSION_PROVIDER_ID =
    `browser:ext:${MOCK_EXTENSION_TARGET}` as const
export const MOCK_EXTENSION_NAME = 'Mock Splice Extension'
export const MOCK_EXTENSION_NETWORK_ID = 'extension-network'
export const MOCK_EXTENSION_TOKEN = 'integration-extension-token'
export const MOCK_EXTENSION_USER_ID = 'extension-user'

const primaryWallet: Wallet = {
    primary: true,
    partyId: 'BrowserParty::1',
    status: 'allocated',
    hint: 'h',
    publicKey: 'pk',
    namespace: 'ns',
    networkId: MOCK_EXTENSION_NETWORK_ID,
    signingProviderId: 'sp',
}

export function extensionConnectResult(): ConnectResult {
    return {
        isConnected: true,
        reason: 'OK',
        isNetworkConnected: true,
        networkReason: 'OK',
    }
}

export function extensionStatusEvent(): StatusEvent {
    return {
        provider: {
            id: MOCK_EXTENSION_PROVIDER_ID,
            providerType: 'browser',
        },
        connection: extensionConnectResult(),
        network: {
            networkId: MOCK_EXTENSION_NETWORK_ID,
            ledgerApi: 'https://ledger.extension.test',
            accessToken: MOCK_EXTENSION_TOKEN,
        },
        session: {
            accessToken: MOCK_EXTENSION_TOKEN,
            userId: MOCK_EXTENSION_USER_ID,
        },
    }
}

type MockResponse =
    | { result: unknown }
    | { error: { code: number; message: string } }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleMockRequest(method: string, _params: unknown): MockResponse {
    switch (method) {
        case 'connect':
            return { result: extensionConnectResult() }
        case 'status':
            return { result: extensionStatusEvent() }
        case 'isConnected':
            return { result: extensionConnectResult() }
        case 'disconnect':
            return { result: null }
        case 'listAccounts':
            return { result: [primaryWallet] satisfies ListAccountsResult }
        default:
            return {
                error: { code: -32601, message: `unhandled method: ${method}` },
            }
    }
}

export type MockExtensionOptions = {
    target?: string | undefined
}

export function startMockExtension(
    options: MockExtensionOptions = {}
): () => void {
    const target = options.target ?? MOCK_EXTENSION_TARGET

    const messageHandler = (event: MessageEvent): void => {
        if (!isSpliceMessageEvent(event)) return
        const data = event.data

        if (data.type === WalletEvent.SPLICE_WALLET_EXT_READY) {
            if (data.target && data.target !== target) return
            const ack: SpliceMessage = {
                type: WalletEvent.SPLICE_WALLET_EXT_ACK,
                target,
            }
            window.postMessage(ack, '*')
            return
        }

        if (data.type === WalletEvent.SPLICE_WALLET_REQUEST) {
            if (data.target && data.target !== target) return
            const res = handleMockRequest(
                data.request.method,
                data.request.params
            )
            const message: SpliceMessage = {
                type: WalletEvent.SPLICE_WALLET_RESPONSE,
                response: {
                    jsonrpc: '2.0',
                    id: data.request.id,
                    ...res,
                },
            }
            window.postMessage(message, '*')
        }
    }

    const announceHandler = (): void => {
        window.dispatchEvent(
            new CustomEvent(CANTON_ANNOUNCE_PROVIDER_EVENT, {
                detail: {
                    id: target,
                    name: MOCK_EXTENSION_NAME,
                    target,
                },
            })
        )
    }

    window.addEventListener('message', messageHandler)
    window.addEventListener(CANTON_REQUEST_PROVIDER_EVENT, announceHandler)
    return () => {
        window.removeEventListener('message', messageHandler)
        window.removeEventListener(
            CANTON_REQUEST_PROVIDER_EVENT,
            announceHandler
        )
    }
}
