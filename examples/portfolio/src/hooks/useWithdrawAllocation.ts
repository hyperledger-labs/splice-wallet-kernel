// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import type { PreparedCommand } from '@canton-network/wallet-sdk'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { submitViaProvider } from '@lib/submit'
import { resolveAllocationAsset } from '@utils/allocation'
import { useInstruments } from './useInstruments'
import { useReachableRegistryUrls, useRegistryUrls } from './useRegistryUrls'
import { useWalletSdk } from './useWalletSdk'
import { queryKeys } from './query-keys'

export const useWithdrawAllocation = () => {
    const { sdk } = useWalletSdk()
    const registryUrls = useRegistryUrls()
    const { reachableRegistryUrls } = useReachableRegistryUrls()
    const instruments = useInstruments()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (args: {
            party: PartyId
            contractId: string
            instrumentId: { admin: PartyId; id: string }
        }) => {
            const asset = resolveAllocationAsset({
                instrumentId: args.instrumentId,
                instruments,
                registryUrls,
                reachableRegistryUrls,
            })
            if (!sdk) {
                throw new Error('Wallet SDK is not ready')
            }

            const preparedCommand = (await sdk.token.allocation.withdraw({
                allocationCid: args.contractId,
                asset,
            })) as PreparedCommand

            await submitViaProvider(preparedCommand, args.party)
        },
        onSuccess: async (_, args) => {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: queryKeys.walletConnection.allocations.forParty(
                        args.party
                    ),
                }),
                queryClient.invalidateQueries({
                    queryKey: queryKeys.walletConnection.holdings.forParty(
                        args.party
                    ),
                }),
            ])
        },
    })
}
