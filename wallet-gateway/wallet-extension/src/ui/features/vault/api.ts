// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    queryOptions,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { vaultMessenger, type VaultStatus } from '@/shared/vault-protocol'
import { queryKeys } from '@/ui/lib/query/keys'

/**
 * The vault status, from the background. `staleTime: 0` makes
 * `fetchQuery` ask the background every time, so route guards never act on a
 * cached status.
 */
export const vaultStatusQuery = () =>
    queryOptions({
        queryKey: queryKeys.vault.status(),
        queryFn: () => vaultMessenger.sendMessage('vault.getStatus'),
        staleTime: 0,
        networkMode: 'always',
    })

// Vault messages stay inside the extension, so they use `networkMode:
// 'always'`. With TanStack's default, an offline browser would pause them,
// and Lock would never reach the background.
//
// The password is the mutation variable, so it sits in the mutation cache
// while the page that submitted it is mounted. `gcTime: 0` drops it as soon as
// that page unmounts. Never put it in a mutation or query key.

export function useCreateVault() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (password: string) =>
            vaultMessenger.sendMessage('vault.create', { password }),
        networkMode: 'always',
        gcTime: 0,
        onSuccess: () => {
            queryClient.setQueryData<VaultStatus>(
                queryKeys.vault.status(),
                'unlocked'
            )
        },
    })
}

export function useUnlockVault() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (password: string) =>
            vaultMessenger.sendMessage('vault.unlock', { password }),
        networkMode: 'always',
        gcTime: 0,
        onSuccess: () => {
            queryClient.setQueryData<VaultStatus>(
                queryKeys.vault.status(),
                'unlocked'
            )
        },
    })
}

export function useLockVault() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: () => vaultMessenger.sendMessage('vault.lock'),
        networkMode: 'always',
        // Drop everything read while unlocked, the status included.
        // watchVaultStatus does the same in every open page; this covers the
        // page that locked even if the storage event comes late.
        onSuccess: () => queryClient.clear(),
    })
}
