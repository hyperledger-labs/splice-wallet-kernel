// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { SigningProvider } from '@canton-network/core-signing-lib'
import {
    assertConnected,
    AuthTokenProvider,
    resolveAuthIdentityProviderId,
} from '@canton-network/core-wallet-auth'
import { authContext } from '../../auth-context'
import { createExtensionWallet } from './create-wallet'
import { toSigningDrivers, type UserControllerDeps } from './deps'
import type { Methods } from './rpc-gen'
import type { CreateWalletParams } from './rpc-gen/typings'

export const wallets = ({
    getStore,
    signingDriver,
    notificationService,
}: UserControllerDeps): Pick<
    Methods,
    | 'createWallet'
    | 'listWallets'
    | 'setPrimaryWallet'
    | 'getWallet'
    | 'removeWallet'
    | 'syncWallets'
    | 'isWalletSyncNeeded'
    | 'allocatePartyForWallet'
    | 'listSigningProviders'
> => ({
    createWallet: async (params: CreateWalletParams) => {
        const context = assertConnected(await authContext.load())
        const store = await getStore()
        const network = await store.getCurrentNetwork()

        if (
            params.signingProviderId !== SigningProvider.WALLET_KERNEL ||
            signingDriver.signingProvider !== SigningProvider.WALLET_KERNEL
        ) {
            throw new Error(
                `Signing provider ${params.signingProviderId} not supported`
            )
        }
        if (!network.adminAuth) {
            throw new Error('No admin auth configured')
        }

        const idp = await store.getIdp(
            resolveAuthIdentityProviderId(
                network.adminAuth,
                network.identityProviderId
            )
        )
        const adminTokenProvider = AuthTokenProvider.fromGatewayConfig(
            idp,
            network.adminAuth
        )
        const ledgerClient = new LedgerClient({
            baseUrl: new URL(network.ledgerApi.baseUrl),
            accessTokenProvider: adminTokenProvider,
        })
        const wallet = await createExtensionWallet({
            authContext: context,
            ledgerClient,
            networkId: network.id,
            partyHint: params.partyHint,
            primary: params.primary ?? false,
            signingDriver,
            store,
            synchronizerId: network.synchronizerId,
        })

        notificationService
            .getNotifier(context.userId)
            .emit('accountsChanged', await store.getWallets())

        return { wallet }
    },
    allocatePartyForWallet: async () => {
        throw new Error('Function allocatePartyForWallet not implemented.')
    },
    setPrimaryWallet: async () => {
        throw new Error('Function setPrimaryWallet not implemented.')
    },
    removeWallet: async () => {
        throw new Error('Function removeWallet not implemented.')
    },
    listWallets: async (params: {
        filter?: { signingProviderIds?: string[] }
    }) => {
        const store = await getStore()
        return await store.getWallets(params.filter)
    },
    syncWallets: async () => {
        throw new Error('Function syncWallets not implemented.')
    },
    isWalletSyncNeeded: async () => {
        throw new Error('Function isWalletSyncNeeded not implemented.')
    },
    listSigningProviders: async () => ({
        signingProviders: Object.keys(toSigningDrivers(signingDriver)),
    }),
    getWallet: async () => {
        throw new Error('Function getWallet not implemented.')
    },
})
