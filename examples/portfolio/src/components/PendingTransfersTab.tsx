// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { useState, useEffect } from 'react'
import {
    type PendingTransfer,
    getPendingTransfers,
} from '../utils/getPendingTransfers.js'
import { acceptTransfer } from '../utils/acceptTransfer.js'
import { AssetCard } from './AssetCard.js'

export type PendingTransfersTabProps = {
    registryUrls: Map<PartyId, string>
    party: string
}

export const PendingTransfersTab: React.FC<PendingTransfersTabProps> = ({
    registryUrls,
    party,
}) => {
    const [pendingTransfers, setPendingTransfers] = useState<
        PendingTransfer[] | undefined
    >(undefined)

    const refreshPendingTransfers = async () => {
        const hs = await getPendingTransfers({ party })
        console.log(hs)
        setPendingTransfers(hs)
    }

    useEffect(() => {
        refreshPendingTransfers()
    }, [party])

    const PendingTransfer = (p: PendingTransfer) => (
        <div>
            sender: <strong>{p.sender}</strong> <br />
            receiver: <strong>{p.receiver}</strong> <br />
            {p.memo && (
                <span>
                    message: <strong>{p.memo}</strong> <br />
                </span>
            )}
            <AssetCard amount={p.amount} symbol={p.instrumentId.id} />
            {p.incoming && (
                <button
                    onClick={() => {
                        acceptTransfer({
                            registryUrls,
                            party,
                            contractId: p.contractId,
                            instrumentId: p.instrumentId,
                        }).then(refreshPendingTransfers)
                    }}
                >
                    Accept
                </button>
            )}
        </div>
    )

    return (
        <div>
            <h2>Incoming</h2>
            <ul>
                {pendingTransfers
                    ?.filter((p) => p.incoming)
                    .map((p) => (
                        <li key={p.contractId}>{PendingTransfer(p)}</li>
                    ))}
            </ul>
            <h2>Outgoing</h2>
            <ul>
                {pendingTransfers
                    ?.filter((p) => !p.incoming)
                    .map((p) => (
                        <li key={p.contractId}>{PendingTransfer(p)}</li>
                    ))}
            </ul>
        </div>
    )
}
