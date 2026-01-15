// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { queryKeys } from './query-keys'

export const useCreateTransfer = () => {
    const { createTransfer } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (args: {
            sender: PartyId
            receiver: PartyId
            instrumentId: { admin: string; id: string }
            amount: string
            memo?: string
        }) =>
            createTransfer({
                registryUrls,
                ...args,
            }),
        onSuccess: async (_, args) => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.listPendingTransfers.forParty(args.sender),
            })
            await queryClient.invalidateQueries({
                queryKey: queryKeys.listPendingTransfers.forParty(
                    args.receiver
                ),
            })
        },
    })
}
