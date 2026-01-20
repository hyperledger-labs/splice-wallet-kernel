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
    amount: string
    memo?: string
}

export const useCreateTransfer = () => {
    const { createTransfer } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (args: CreateTransferArgs) =>
            createTransfer({
                registryUrls,
                ...args,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.listPendingTransfers.all,
            })
            await queryClient.invalidateQueries({
                queryKey: queryKeys.listHoldings.all,
            })
        },
    })
}
