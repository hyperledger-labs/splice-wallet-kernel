// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import type {
    PrettyContract,
    TransferInstructionView,
} from '@canton-network/core-ledger-client'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { TransferCard } from './TransferCard.js'

export const PendingTransfersTab: React.FC = () => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { listPendingTransfers } = usePortfolio()
    const [pendingTransfers, setPendingTransfers] = useState<
        PrettyContract<TransferInstructionView>[] | undefined
    >(undefined)

    useEffect(() => {
        ;(async () => {
            if (primaryParty) {
                const hs = await listPendingTransfers({ party: primaryParty })
                setPendingTransfers(hs)
            } else {
                setPendingTransfers(undefined)
            }
        })()
    }, [primaryParty, listPendingTransfers])

    return (
        <div>
            <h2>Pending transfers</h2>
            {primaryParty && (
                <ul>
                    {pendingTransfers?.map((p) => (
                        <li key={p.contractId}>
                            <TransferCard
                                party={primaryParty}
                                contractId={p.contractId}
                                transferInstructionView={p.interfaceViewValue}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
