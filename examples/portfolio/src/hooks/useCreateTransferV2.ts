// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { submitViaProvider } from '@lib/submit'
import { useReachableRegistryUrls, useRegistryUrls } from './useRegistryUrls'
import { queryKeys } from './query-keys'
import { useWalletSdk } from './useWalletSdk'
import type { AssetBody } from '@canton-network/wallet-sdk'

export interface CreateTransferArgs {
    sender: string
    receiver: string
    instrumentId: { admin: PartyId; id: string }
    amount: string
    expiry: Date
    memo?: string
}

export const useCreateTransferV2 = () => {
    const { sdk } = useWalletSdk()
    const registryUrls = useRegistryUrls()
    const { reachableRegistryUrls } = useReachableRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (args: CreateTransferArgs) => {
            if (!sdk) {
                throw new Error('Wallet SDK is not ready')
            }

            const registryUrl = registryUrls.get(args.instrumentId.admin)
            if (!registryUrl) {
                throw new Error(
                    `no registry URL for admin ${args.instrumentId.admin}`
                )
            }

            if (
                reachableRegistryUrls.get(args.instrumentId.admin) !==
                registryUrl
            ) {
                throw new Error(
                    `Registry for admin ${args.instrumentId.admin} is not reachable`
                )
            }
            const asset: AssetBody = await sdk.token.find(args.instrumentId.id)
            if (!asset.capabilities.transferInstruction.includes('v2')) {
                throw new Error(
                    `Asset capabilities does not support v2. Try with a v1 transfer intead.`
                )
            }

            const preparedCommand = await sdk.token.v2.transfer.create({
                sender: args.sender,
                recipient: args.receiver,
                amount: args.amount,
                instrumentId: args.instrumentId.id,
                registryUrl: new URL(registryUrl),
                expirationDate: args.expiry,
                memo: args.memo,
            })

            await submitViaProvider(preparedCommand, args.sender)
        },
        onSuccess: () => {
            // Refetch in the background so broad holdings/history refreshes do
            // not keep the completed transfer mutation pending.
            void queryClient.invalidateQueries({
                queryKey: queryKeys.walletConnection.pendingTransfers.all,
            })
            void queryClient.invalidateQueries({
                queryKey: queryKeys.walletConnection.holdings.all,
            })
            void queryClient.invalidateQueries({
                queryKey: queryKeys.walletConnection.transactionHistory.all,
            })
        },
    })
}
