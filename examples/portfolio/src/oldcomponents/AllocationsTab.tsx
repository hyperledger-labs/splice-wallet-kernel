// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'

export const AllocationsTab: React.FC = () => {
    const portfolio = usePortfolio()
    const {
        status: { primaryParty },
    } = useConnection()

    useEffect(() => {
        if (primaryParty) {
            ;(async () => {
                const pendingAllocationInstructions =
                    await portfolio.listPendingAllocationInstructions({
                        party: primaryParty,
                    })
                console.log(
                    'pendingAllocationInstructions',
                    pendingAllocationInstructions
                )
                const pendingAllocationRequests =
                    await portfolio.listPendingAllocationRequests({
                        party: primaryParty,
                    })
                console.log(
                    'pendingAllocationRequests',
                    pendingAllocationRequests
                )
                const pendingAllocations =
                    await portfolio.listPendingAllocations({
                        party: primaryParty,
                    })
                console.log('pendingAllocations', pendingAllocations)
            })()
        }
    }, [portfolio, primaryParty])

    return <div>Allocations</div>
}
