// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'

export const useWithdrawAllocation = () => {
    const { withdrawAllocation } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (args: {
            party: PartyId
            contractId: string
            instrumentId: { admin: string; id: string }
        }) =>
            withdrawAllocation({
                registryUrls,
                ...args,
            }),
        onSuccess: async (_, args) => {
            await queryClient.invalidateQueries({
                queryKey: ['listAllocations', args.party],
            })
        },
    })
}
