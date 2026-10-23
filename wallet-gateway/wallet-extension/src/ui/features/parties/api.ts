// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    allocationResultToast,
    isWalletSyncNeeded,
    loadWallets,
    syncWallets,
    walletSyncResultToast,
} from '@canton-network/core-wallet-ui-components/logic'
import {
    useErrorToast,
    useToast,
} from '@canton-network/core-wallet-ui-components/react'
import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { getUserClient } from '@/ui/lib/user-client'
import { queryKeys } from '@/ui/lib/query/keys'

// Everything here talks to the background, so none of it needs the network:
// `networkMode: 'always'`, as in the vault queries.

export const walletsQuery = () =>
    queryOptions({
        queryKey: queryKeys.wallets.list(),
        queryFn: () => loadWallets(getUserClient()),
        networkMode: 'always',
    })

export const walletSyncNeededQuery = () =>
    queryOptions({
        queryKey: queryKeys.wallets.syncNeeded(),
        queryFn: () => isWalletSyncNeeded(getUserClient()),
        networkMode: 'always',
    })

export function useSyncWallets() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const showError = useErrorToast()
    return useMutation({
        mutationFn: () => syncWallets(getUserClient()),
        networkMode: 'always',
        onSuccess: (result) => showToast(walletSyncResultToast(result)),
        onError: (error) => showError(error),
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all }),
    })
}

export function useSetPrimaryWallet() {
    const queryClient = useQueryClient()
    const showError = useErrorToast()
    return useMutation({
        mutationFn: (partyId: string) =>
            getUserClient().request({
                method: 'setPrimaryWallet',
                params: { partyId },
            }),
        networkMode: 'always',
        onError: (error) => showError(error),
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all }),
    })
}

export function useAllocateWallet() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const showError = useErrorToast()
    return useMutation({
        mutationFn: (partyId: string) =>
            getUserClient().request({
                method: 'allocatePartyForWallet',
                params: { partyId },
            }),
        networkMode: 'always',
        onSuccess: (result) => {
            const toast = result?.wallet
                ? allocationResultToast(result.wallet.status)
                : undefined
            if (toast) showToast(toast)
        },
        onError: (error) => showError(error),
        onSettled: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.wallets.all }),
    })
}
