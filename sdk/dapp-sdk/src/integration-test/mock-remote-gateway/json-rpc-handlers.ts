// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { StatusEvent as RemoteStatusEvent } from '@canton-network/core-wallet-dapp-remote-rpc-client'

export const MOCK_DAPP_API_PATH = '/api/v0/dapp'
export const MOCK_USER_API_PATH = '/api/v0/dapp'

function jsonRpcResult(id: string | number | null, result: unknown) {
    return { jsonrpc: '2.0' as const, id, result }
}

const primaryWallet = {
    primary: true,
    partyId: 'RemoteParty::1',
    status: 'allocated' as const,
    hint: 'h',
    publicKey: 'pk',
    namespace: 'ns',
    networkId: 'remote-net',
    signingProviderId: 'sp',
    rights: [] as unknown[],
}

function statusConnected(rpcBase: string): RemoteStatusEvent {
    return {
        provider: {
            id: 'remote-kernel',
            version: '0',
            providerType: 'remote',
            url: rpcBase,
            userUrl: `${rpcBase}/login`,
        },
        connection: {
            isConnected: true,
            reason: 'OK',
            isNetworkConnected: true,
            networkReason: 'OK',
            userUrl: `${rpcBase}/login`,
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

export function handleMockJsonRpc(
    rpcBase: string,
    body: { id: string | number | null; method: string; params?: unknown }
): { status: number; json: unknown } {
    const { method, id, params } = body

    switch (method) {
        case 'connect':
            return {
                status: 200,
                json: jsonRpcResult(id, {
                    userUrl: `${rpcBase}${MOCK_USER_API_PATH}/login`,
                    isConnected: false,
                    isNetworkConnected: false,
                }),
            }
        case 'status':
            return {
                status: 200,
                json: jsonRpcResult(id, statusConnected(rpcBase)),
            }
        case 'disconnect':
            return { status: 200, json: jsonRpcResult(id, null) }
        case 'listAccounts':
            return { status: 200, json: jsonRpcResult(id, [primaryWallet]) }
        case 'ledgerApi':
            return {
                status: 200,
                json: jsonRpcResult(id, {
                    mocked: true,
                    resource: (params as { resource?: string })?.resource,
                }),
            }
        case 'prepareExecute':
            return {
                status: 200,
                json: jsonRpcResult(id, {
                    userUrl: `${rpcBase}/approve`,
                }),
            }
        case 'getPrimaryAccount':
            return { status: 200, json: jsonRpcResult(id, primaryWallet) }
        case 'getActiveNetwork':
            return {
                status: 200,
                json: jsonRpcResult(id, {
                    networkId: 'remote-net',
                    ledgerApi: 'https://ledger.remote.test',
                    accessToken: 'integration-test-token',
                }),
            }
        default:
            return {
                status: 200,
                json: {
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32601,
                        message: `unhandled method: ${method}`,
                    },
                },
            }
    }
}
