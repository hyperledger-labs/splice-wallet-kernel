// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Holding } from '@canton-network/core-ledger-client'
import { useState, useEffect } from 'react'
import { AssetCard } from './AssetCard.js'
import { getHoldings } from '../utils/getHoldings.js'
import { tap } from '../utils/tap.js'

export type HoldingsTabProps = {
    party: string
    sessionToken?: string // used to tap
}

export const HoldingsTab: React.FC<HoldingsTabProps> = ({
    party,
    sessionToken,
}) => {
    const [holdings, setHoldings] = useState<Holding[] | undefined>(undefined)
    const [tapAmount, setTapAmount] = useState<number>(10000)

    const refreshHoldings = async () => {
        const hs = await getHoldings({ party })
        setHoldings(hs)
    }

    useEffect(() => {
        refreshHoldings()
    }, [party])
    return (
        <div>
            <input
                type="number"
                value={tapAmount}
                onChange={(e) => setTapAmount(Number(e.target.value))}
            />
            <button
                disabled={!sessionToken}
                onClick={() => {
                    tap({
                        party,
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
