// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useQueryClient, useMutation } from '@tanstack/react-query'
import { type AllocationSpecification } from '@canton-network/core-token-standard'
import { type PartyId } from '@canton-network/core-types'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'

export const useCreateAllocation = () => {
    const { createAllocation } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (args: {
            party: PartyId
            allocationSpecification: AllocationSpecification
        }) =>
            createAllocation({
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
