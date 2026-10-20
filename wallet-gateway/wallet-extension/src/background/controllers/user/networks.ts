// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Network } from '@canton-network/core-wallet-store'
import type { UserControllerDeps } from './deps'
import type { Methods } from './rpc-gen'
import type {
    Auth,
    Network as ApiNetwork,
    PublicNetwork,
} from './rpc-gen/typings'

function toAuthDto(auth: Auth): ApiNetwork['auth'] {
    switch (auth.method) {
        case 'authorization_code':
            return {
                method: auth.method,
                audience: auth.audience,
                scope: auth.scope,
                clientId: auth.clientId,
            }
        case 'client_credentials':
            return {
                method: auth.method,
                ...(auth.identityProviderId
                    ? { identityProviderId: auth.identityProviderId }
                    : {}),
                audience: auth.audience,
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
            }
        case 'self_signed':
            return {
                method: auth.method,
                audience: auth.audience,
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
                issuer: auth.issuer,
            }
        case 'self_issued':
            return {
                method: auth.method,
                audience: auth.audience,
                scope: auth.scope,
            }
    }
}

export function toNetworkDto(network: Network): ApiNetwork {
    return {
        id: network.id,
        name: network.name,
        description: network.description,
        synchronizerId: network.synchronizerId,
        identityProviderId: network.identityProviderId,
        ledgerApi: network.ledgerApi.baseUrl,
        auth: toAuthDto(network.auth),
        ...(network.adminAuth
            ? { adminAuth: toAuthDto(network.adminAuth) }
            : {}),
        ...(network.serviceAccountAuth
            ? { serviceAccountAuth: toAuthDto(network.serviceAccountAuth) }
            : {}),
    }
}

function toPublicNetwork(network: Network): PublicNetwork {
    const auth = network.auth

    return {
        id: network.id,
        name: network.name,
        description: network.description,
        synchronizerId: network.synchronizerId,
        identityProviderId: network.identityProviderId,
        ledgerApi: network.ledgerApi.baseUrl,
        authMethod: auth.method,
        ...(auth.method !== 'client_credentials' && {
            ...('clientId' in auth ? { clientId: auth.clientId } : {}),
            scope: auth.scope,
            audience: auth.audience,
        }),
    }
}

export const networks = ({
    getStore,
}: UserControllerDeps): Pick<
    Methods,
    | 'listNetworks'
    | 'getNetwork'
    | 'addNetwork'
    | 'removeNetwork'
    | 'listIdps'
    | 'addIdp'
    | 'removeIdp'
    | 'selfSignedAccessToken'
    | 'getUser'
> => ({
    addNetwork: async () => {
        throw new Error('Function addNetwork not implemented.')
    },
    removeNetwork: async () => {
        throw new Error('Function removeNetwork not implemented.')
    },
    listNetworks: async () => {
        const store = await getStore()
        const networks = await store.listNetworks()
        return { networks: networks.map(toPublicNetwork) }
    },
    getNetwork: async () => {
        throw new Error('Function getNetwork not implemented.')
    },
    selfSignedAccessToken: async () => {
        throw new Error('Function selfSignedAccessToken not implemented.')
    },
    addIdp: async () => {
        throw new Error('Function addIdp not implemented.')
    },
    removeIdp: async () => {
        throw new Error('Function removeIdp not implemented.')
    },
    listIdps: async () => {
        const store = await getStore()
        return { idps: await store.listIdps() }
    },
    getUser: async () => {
        throw new Error('Function getUser not implemented.')
    },
})
