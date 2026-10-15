// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest'
import {
    NetworkDeleteEvent,
    NetworkEditSaveEvent,
} from '@canton-network/core-wallet-ui-components'
import type {
    Idp,
    Network,
    PublicNetwork,
    Transaction,
    ApiKey,
} from '@canton-network/core-wallet-user-rpc-client'
import type { Wallet } from '@canton-network/core-wallet-store'

export const mockRequest = vi.fn()

export function createMockUserClient() {
    return { request: mockRequest }
}

export function makeWallet(overrides: Partial<Wallet> = {}): Wallet {
    return {
        primary: false,
        partyId: 'alice::1220abc',
        status: 'allocated',
        hint: 'alice',
        publicKey: 'pk',
        namespace: '1220abc',
        networkId: 'network1',
        signingProviderId: 'internal',
        rights: [],
        userId: 'user-1',
        ...overrides,
    }
}

export function makeTransaction(
    overrides: Partial<Transaction> = {}
): Transaction {
    return {
        id: 'tx-1',
        commandId: 'cmd-1',
        status: 'pending',
        preparedTransaction: 'prepared-tx-blob',
        preparedTransactionHash: 'hash-abc',
        createdAt: '2024-06-01T12:00:00.000Z',
        origin: 'https://dapp.example',
        ...overrides,
    }
}

export function makeIdp(overrides: Partial<Idp> = {}): Idp {
    return {
        id: 'idp-1',
        type: 'oauth',
        issuer: 'https://issuer.example',
        configUrl: 'https://config.example/.well-known/openid-configuration',
        ...overrides,
    }
}

export function makeNetwork(overrides: Partial<Network> = {}): Network {
    return {
        id: 'net-1',
        name: 'Test Network',
        description: 'Test network description',
        identityProviderId: 'idp-1',
        ledgerApi: 'http://localhost:6865',
        auth: {
            method: 'client_credentials',
            audience: 'audience',
            scope: 'scope',
            clientId: 'client-id',
            clientSecret: 'client-secret',
        },
        ...overrides,
    }
}

export function makePublicNetwork(
    overrides: Partial<PublicNetwork> = {}
): PublicNetwork {
    return {
        id: 'net-1',
        name: 'Test Network',
        description: 'Test network description',
        identityProviderId: 'idp-1',
        ledgerApi: 'http://localhost:6865',
        authMethod: 'client_credentials',
        ...overrides,
    }
}

export function makeApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
    return {
        id: 'api-key-1',
        name: 'Test API Key',
        createdAt: '2026-06-18T12:00:00.000Z',
        ...overrides,
    }
}

function withoutUndefinedKeys<T extends object>(value: Partial<T>): Partial<T> {
    return Object.fromEntries(
        Object.entries(value).filter(([, v]) => v !== undefined)
    ) as Partial<T>
}

export function networkEditSaveEvent(
    overrides: Partial<Network> = {}
): NetworkEditSaveEvent {
    return new NetworkEditSaveEvent(
        makeNetwork(withoutUndefinedKeys(overrides))
    )
}

export function networkEditSaveEventFrom(
    network: Network
): NetworkEditSaveEvent {
    return new NetworkEditSaveEvent(network)
}

export function networkDeleteEvent(
    overrides: Partial<Network> = {}
): NetworkDeleteEvent {
    return new NetworkDeleteEvent(makeNetwork(withoutUndefinedKeys(overrides)))
}

export function toPublicNetwork(network: Network): PublicNetwork {
    const auth = network.auth

    return {
        id: network.id,
        name: network.name,
        description: network.description,
        identityProviderId: network.identityProviderId,
        ledgerApi: network.ledgerApi,
        authMethod: auth.method,
        ...(network.synchronizerId !== undefined && {
            synchronizerId: network.synchronizerId,
        }),
        ...(auth.method !== 'client_credentials' && {
            clientId: auth.clientId,
            scope: auth.scope,
            audience: auth.audience,
        }),
    }
}

export function mockListWalletsFlow(
    wallets: Wallet[],
    networkId = 'network1'
): void {
    mockRequest.mockImplementation(async ({ method, params }) => {
        if (method === 'listSessions') {
            return {
                sessions: [
                    {
                        id: 'sess-1',
                        network: { id: networkId, name: 'Test' },
                    },
                ],
            }
        }
        if (method === 'listWallets') {
            if (
                params?.filter?.networkIds &&
                !params.filter.networkIds.includes(networkId)
            ) {
                return []
            }
            return wallets
        }
        return undefined
    })
}

export function mockNetworksPageFlow(
    networks: PublicNetwork[],
    options: { isAdmin?: boolean } = {}
): void {
    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'listNetworks') {
            return { networks }
        }
        if (method === 'listSessions') {
            return { sessions: [] }
        }
        if (method === 'getUser') {
            return {
                userId: 'user-1',
                isAdmin: options.isAdmin ?? false,
            }
        }
        if (method === 'addNetwork' || method === 'removeNetwork') {
            return undefined
        }
        return undefined
    })
}

export function mockApiKeysPageFlow(
    apiKeys: ApiKey[],
    options: { isAdmin?: boolean } = {}
): void {
    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'listApiKeys') {
            return { apiKeys }
        }
        if (method === 'listSessions') {
            return { sessions: [] }
        }
        if (method === 'getUser') {
            return {
                userId: 'user-1',
                isAdmin: options.isAdmin ?? false,
            }
        }
        if (method === 'generateApiKey' || method === 'removeApiKey') {
            return { id: 'test-api-key' }
        }
        return undefined
    })
}

export function mockReviewNetworkFlow(
    overrides: Partial<Network> = {},
    options: { isAdmin?: boolean } = {}
): Network {
    const network = makeNetwork(overrides)

    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'getNetwork') {
            return { network }
        }
        if (method === 'getUser') {
            return {
                userId: 'user-1',
                isAdmin: options.isAdmin ?? true,
            }
        }
        if (method === 'addNetwork' || method === 'removeNetwork') {
            return undefined
        }
        return undefined
    })

    return network
}

export function mockIdpsPageFlow(
    idps: Idp[],
    options: { isAdmin?: boolean } = {}
): void {
    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'listIdps') {
            return { idps }
        }
        if (method === 'getUser') {
            return {
                userId: 'user-1',
                isAdmin: options.isAdmin ?? false,
            }
        }
        if (method === 'addIdp' || method === 'removeIdp') {
            return undefined
        }
        return undefined
    })
}

export function mockSettingsPageFlow(
    options: {
        networks?: PublicNetwork[]
        sessions?: { id: string; network: { id: string } }[]
        idps?: Idp[]
        isAdmin?: boolean
        userId?: string
        gatewayVersion?: string
    } = {}
): void {
    const {
        networks = [makePublicNetwork()],
        sessions = [{ id: 'sess-1', network: { id: 'net-1' } }],
        idps = [makeIdp()],
        isAdmin = true,
        userId = 'user-1',
        gatewayVersion = '1.2.3',
    } = options

    mockRequest.mockImplementation(async ({ method }) => {
        if (method === 'listNetworks') {
            return { networks }
        }
        if (method === 'listSessions') {
            return { sessions }
        }
        if (method === 'listIdps') {
            return { idps }
        }
        if (method === 'getUser') {
            return { userId, isAdmin }
        }
        if (
            method === 'addNetwork' ||
            method === 'removeNetwork' ||
            method === 'addIdp' ||
            method === 'removeIdp'
        ) {
            return undefined
        }
        return undefined
    })

    const originalFetch = globalThis.fetch.bind(globalThis)
    vi.stubGlobal(
        'fetch',
        async (input: RequestInfo | URL, init?: RequestInit) => {
            const url =
                typeof input === 'string'
                    ? input
                    : input instanceof URL
                      ? input.href
                      : input.url
            if (url.includes('/.well-known/wallet-gateway-version')) {
                return new Response(
                    JSON.stringify({ version: gatewayVersion }),
                    {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            }
            return originalFetch(input, init)
        }
    )
}
