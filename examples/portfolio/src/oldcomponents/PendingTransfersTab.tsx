// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { type Transfer } from '../utils/transfers'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { TransferCard } from './TransferCard.js'

export const PendingTransfersTab: React.FC = () => {
    const {
        status: { primaryParty },
    } = useConnection()
    const { listPendingTransfers } = usePortfolio()
    const [pendingTransfers, setPendingTransfers] = useState<
        Transfer[] | undefined
    >(undefined)

    const refreshPendingTransfers = async () => {
        if (primaryParty) {
            const hs = await listPendingTransfers({ party: primaryParty })
            setPendingTransfers(hs)
        } else {
            setPendingTransfers(undefined)
        }
    }

    useEffect(() => {
        refreshPendingTransfers()
    }, [primaryParty])

    return (
        <div>
            <h2>Incoming</h2>
            {primaryParty && (
                <ul>
                    {pendingTransfers
                        ?.filter((p) => p.incoming)
                        .map((p) => (
                            <li key={p.contractId}>
                                <TransferCard
                                    party={primaryParty}
                                    transfer={p}
                                />
                            </li>
                        ))}
                </ul>
            )}
            <h2>Outgoing</h2>
            {primaryParty && (
                <ul>
                    {pendingTransfers
                        ?.filter((p) => !p.incoming)
                        .map((p) => (
                            <li key={p.contractId}>
                                <TransferCard
                                    party={primaryParty}
                                    transfer={p}
                                />
                            </li>
                        ))}
                </ul>
            )}
        </div>
    )
}
