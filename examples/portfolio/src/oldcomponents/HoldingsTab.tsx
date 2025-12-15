// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Holding } from '@canton-network/core-ledger-client'
import { useState, useEffect } from 'react'
import { AssetCard } from './AssetCard.js'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { tap } from '../utils/tap.js'

export const HoldingsTab: React.FC = () => {
    const {
        status: { primaryParty, sessionToken },
    } = useConnection()
    const { listHoldings } = usePortfolio()
    const [holdings, setHoldings] = useState<Holding[] | undefined>(undefined)
    const [tapAmount, setTapAmount] = useState<number>(10000)

    const refreshHoldings = async () => {
        if (primaryParty) {
            const hs = await listHoldings({ party: primaryParty })
            setHoldings(hs)
        } else {
            setHoldings(undefined)
        }
    }

    useEffect(() => {
        refreshHoldings()
    }, [primaryParty])

    return (
        <div>
            <input
                type="number"
                value={tapAmount}
                onChange={(e) => setTapAmount(Number(e.target.value))}
            />
            <button
                disabled={!sessionToken || !primaryParty}
                onClick={() => {
                    tap({
                        party: primaryParty!,
                        sessionToken: sessionToken!,
                        amount: tapAmount,
                    }).then(() => refreshHoldings())
                }}
            >
                TAP
            </button>
            <ul>
                {holdings?.map((h) => {
                    return (
                        <li key={h.contractId}>
                            <AssetCard
                                amount={h.amount}
                                symbol={h.instrumentId.id}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
