// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as dappSdk from '@canton-network/dapp-sdk'
import * as walletSdk from '@canton-network/wallet-sdk'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolioConfig } from '@contexts/PortfolioConfigContext'
import { queryKeys } from './query-keys'
import { useReachableRegistryUrls } from './useRegistryUrls'
import { WalletSDKUtilitiesPlugin } from '@lib/utilities-wallet-sdk-plugin'
import { globalSynchronizer } from '@lib/synchronizer'

const deriveScanApiUrl = (registryUrl: string): URL => {
    const url = new URL(registryUrl)
    url.pathname = '/api/scan'
    url.search = ''
    url.hash = ''
    return url
}

export type ReadyWalletSdk = walletSdk.SDKInterface<'amulet' | 'token'> &
    walletSdk.RegisteredPlugins<[typeof WalletSDKUtilitiesPlugin]>
export type WalletSdk = ReadyWalletSdk | undefined

export const useWalletSdk = (): {
    sdk: WalletSdk
    isLoading: boolean
    error: string | undefined
    refresh: () => void
} => {
    const { status, sessionTokenVersion } = useConnection()
    const { amulet, token } = usePortfolioConfig()
    const { reachableRegistryUrls, isChecking } = useReachableRegistryUrls()
    const sessionToken = status?.session?.accessToken
    const isConnected = status?.connection?.isConnected ?? false
    const sdkRegistryUrls = useMemo(
        () => [...new Set(reachableRegistryUrls.values())].sort(),
        [reachableRegistryUrls]
    )

    const walletSdkQuery = useQuery({
        queryKey: queryKeys.walletConnection.walletSdk.forConfig({
            tokenVersion: sessionTokenVersion,
            registryUrls: sdkRegistryUrls,
        }),
        enabled: isConnected && !!sessionToken && !isChecking,
        staleTime: Infinity,
        gcTime: 0,
        refetchInterval: false,
        refetchOnWindowFocus: false,
        retry: false,
        queryFn: async () => {
            if (!sessionToken) {
                throw new Error('Wallet session token is not available')
            }

            const provider = dappSdk.getConnectedProvider()
            if (!provider) {
                throw new Error('Dapp provider is not available')
            }

            const auth = { method: 'static' as const, token: sessionToken }
            const sdk = await walletSdk.SDK.create({
                ledgerProvider: provider as never,
                synchronizerId: globalSynchronizer,
                amulet: {
                    validatorUrl: amulet.validatorUrl,
                    scanApiUrl: deriveScanApiUrl(amulet.registry),
                    registryUrl: amulet.registry,
                    auth,
                    registryAuth: 'none',
                },
                token: {
                    validatorUrl: token.validatorUrl,
                    registries: sdkRegistryUrls,
                    auth,
                    registryAuth: 'none',
                },
            })

            return sdk.registerPlugins([WalletSDKUtilitiesPlugin])
        },
    })

    return {
        sdk: walletSdkQuery.data,
        isLoading:
            isChecking || walletSdkQuery.isLoading || walletSdkQuery.isFetching,
        error:
            walletSdkQuery.error instanceof Error
                ? walletSdkQuery.error.message
                : walletSdkQuery.error
                  ? JSON.stringify(
                        walletSdkQuery.error,
                        Object.getOwnPropertyNames(walletSdkQuery.error)
                    )
                  : undefined,
        refresh: () => {
            void walletSdkQuery.refetch()
        },
    }
}
