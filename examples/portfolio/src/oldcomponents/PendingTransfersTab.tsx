// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from 'react'
import { type Transfer, getPendingTransfers } from '../utils/transfers'
import { TransferCard } from './TransferCard.js'

export type PendingTransfersTabProps = {
    party: string
}

export const PendingTransfersTab: React.FC<PendingTransfersTabProps> = ({
    party,
}) => {
    const [pendingTransfers, setPendingTransfers] = useState<
        Transfer[] | undefined
    >(undefined)

    const refreshPendingTransfers = async () => {
        const hs = await getPendingTransfers({ party })
        setPendingTransfers(hs)
    }

    useEffect(() => {
        refreshPendingTransfers()
    }, [party])

    return (
        <div>
            <h2>Incoming</h2>
            <ul>
                {pendingTransfers
                    ?.filter((p) => p.incoming)
                    .map((p) => (
                        <li key={p.contractId}>
                            <TransferCard party={party} transfer={p} />
                        </li>
                    ))}
            </ul>
            <h2>Outgoing</h2>
            <ul>
                {pendingTransfers
                    ?.filter((p) => !p.incoming)
                    .map((p) => (
                        <li key={p.contractId}>
                            <TransferCard party={party} transfer={p} />
                        </li>
                    ))}
            </ul>
        </div>
    )
}
