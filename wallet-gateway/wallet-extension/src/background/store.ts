// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { SigningDriverStore } from '@canton-network/core-signing-lib'
import { WxtStore } from '@canton-network/core-signing-store-wxt'
import type { AuthAware } from '@canton-network/core-wallet-auth'
import type { Store } from '@canton-network/core-wallet-store'
import {
    StoreInternal,
    type StoreInternalConfig,
} from '@canton-network/core-wallet-store-inmemory'
import { logger } from '@/shared/logger'
import { authContext } from './auth-context'

export type WalletStore = Store & AuthAware<Store>

/** The wallet store, scoped to the signed-in user (if any). */
export async function loadAuthedStore(store: WalletStore): Promise<Store> {
    return store.withAuthContext(await authContext.load())
}

export async function initializeWalletStore(): Promise<WalletStore> {
    const config: StoreInternalConfig = {
        idps: [
            {
                id: 'idp-mock-oauth',
                type: 'oauth',
                issuer: 'http://127.0.0.1:8889',
                configUrl:
                    'http://127.0.0.1:8889/.well-known/openid-configuration',
            },
        ],
        networks: [
            {
                id: 'canton:local-oauth',
                name: 'Local (OAuth IDP)',
                description: 'Mock OAuth IDP',
                synchronizerId:
                    'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
                identityProviderId: 'idp-mock-oauth',
                auth: {
                    method: 'authorization_code',
                    clientId: 'operator',
                    scope: 'openid email daml_ledger_api offline_access',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                },
                adminAuth: {
                    method: 'client_credentials',
                    scope: 'daml_ledger_api',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                    clientId: 'participant_admin',
                    clientSecret: 'admin-client-secret',
                },
                serviceAccountAuth: {
                    method: 'client_credentials',
                    scope: 'daml_ledger_api',
                    audience:
                        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
                    clientId: 'service_account',
                    clientSecret: 'service-account-secret',
                },
                ledgerApi: {
                    baseUrl: 'http://127.0.0.1:5003',
                },
            },
        ],
    }

    return new StoreInternal(config, logger, await authContext.load())
}

export function initializeSigningStore(): SigningDriverStore {
    // Signing keys are stored for this browser profile and remain available
    // when the user logs out or signs in again.
    return new WxtStore('extension-user')
}
