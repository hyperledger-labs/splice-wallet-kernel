// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { WalletEvent } from '@canton-network/core-types'
import type { StatusEvent as RemoteStatusEvent } from '@canton-network/core-wallet-dapp-remote-rpc-client'

export const DAPP_URL = 'http://127.0.0.1:3030/api/v0/dapp'
export const USER_URL = 'http://127.0.0.1:3030'

export const MOCK_REMOTE_SSE_URL = new URL(
    'events',
    DAPP_URL.replace(/\/?$/, '/')
).toString()

function jsonRpcResult(id: string | number | null, result: unknown) {
    return { jsonrpc: '2.0' as const, id, result }
}

const primaryWallet = {
    primary: true,
    partyId: 'mock-party::1220',
    status: 'allocated' as const,
    hint: 'mock-hint',
    publicKey: 'mock-pk',
    namespace: 'mock-namespace',
    networkId: 'mock-networkId',
    signingProviderId: 'mock-signingProviderId',
    rights: [] as unknown[],
}

function statusConnected(): RemoteStatusEvent {
    return {
        provider: {
            id: 'remote-kernel',
            version: '0',
            providerType: 'remote',
            url: DAPP_URL,
            userUrl: `${USER_URL}/login`,
        },
        connection: {
            isConnected: true,
            reason: 'OK',
            isNetworkConnected: true,
            networkReason: 'OK',
            userUrl: `${USER_URL}/login`,
        },
        network: {
            networkId: 'remote-net',
            ledgerApi: 'https://ledger.remote.test',
            accessToken: 'integration-test-token',
        },
        session: {
            accessToken: 'integration-test-token',
            userId: 'remote-user',
        },
    }
}

function dispatchMockAuthSuccess(): void {
    queueMicrotask(() => {
        window.dispatchEvent(
            new MessageEvent('message', {
                origin: window.location.origin,
                data: {
                    type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                    token: 'integration-test-token',
                    sessionId: 'integration-test-session',
                },
            })
        )
    })
}

export function createRemoteGatewayHandlers() {
    return [
        http.post(DAPP_URL, async ({ request }) => {
            const body = (await request.json()) as {
                id: string | number | null
                method: string
                params?: unknown
            }
            const { method, id, params } = body

            switch (method) {
                case 'connect':
                    dispatchMockAuthSuccess()
                    return HttpResponse.json(
                        jsonRpcResult(id, {
                            userUrl: `${USER_URL}/login`,
                            isConnected: false,
                            isNetworkConnected: false,
                        })
                    )
                case 'status':
                    return HttpResponse.json(
                        jsonRpcResult(id, statusConnected())
                    )
                case 'disconnect':
                    return HttpResponse.json(jsonRpcResult(id, null))
                case 'listAccounts':
                    return HttpResponse.json(jsonRpcResult(id, [primaryWallet]))
                case 'ledgerApi':
                    return HttpResponse.json(
                        jsonRpcResult(id, {
                            mocked: true,
                            resource: (params as { resource?: string })
                                ?.resource,
                        })
                    )
                case 'prepareExecute':
                    return HttpResponse.json(
                        jsonRpcResult(id, {
                            userUrl: `${USER_URL}/approve`,
                        })
                    )
                case 'getPrimaryAccount':
                    return HttpResponse.json(jsonRpcResult(id, primaryWallet))
                case 'getActiveNetwork':
                    return HttpResponse.json(
                        jsonRpcResult(id, {
                            networkId: 'remote-net',
                            ledgerApi: 'https://ledger.remote.test',
                            accessToken: 'integration-test-token',
                        })
                    )
                default:
                    return HttpResponse.json(
                        {
                            jsonrpc: '2.0',
                            id,
                            error: {
                                code: -32601,
                                message: `unhandled method: ${method}`,
                            },
                        },
                        { status: 200 }
                    )
            }
        }),

        http.get(MOCK_REMOTE_SSE_URL, () => {
            const stream = new ReadableStream({
                start(controller) {
                    const encoder = new TextEncoder()
                    controller.enqueue(encoder.encode(':ok\n\n'))
                },
            })
            return new HttpResponse(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                },
            })
        }),
    ]
}

export const remoteWalletMockServer = setupServer(
    ...createRemoteGatewayHandlers()
)
