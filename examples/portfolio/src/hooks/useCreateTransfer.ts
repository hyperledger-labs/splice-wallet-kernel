// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { queryKeys } from './query-keys'

export interface CreateTransferArgs {
    sender: string
    receiver: string
    instrumentId: { admin: PartyId; id: string }
    amount: number
    memo?: string
}

export const useCreateTransfer = () => {
    const { createTransfer } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (args: CreateTransferArgs) =>
            createTransfer({
                registryUrls,
                sender: args.sender,
                receiver: args.receiver,
                instrumentId: args.instrumentId,
                amount: args.amount,
                memo: args.memo,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.allHoldings,
                refetchType: 'all',
            })

            await queryClient.invalidateQueries({
                queryKey: queryKeys.allPendingTransfers,
                refetchType: 'all',
            })
        },
    })
}
