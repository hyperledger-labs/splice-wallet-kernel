// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState, useEffect } from 'react'
import { type Holding } from '@canton-network/core-ledger-client'
import { useConnection } from '../contexts/ConnectionContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { useRegistryUrls } from '../contexts/RegistryServiceContext.js'
import { AssetCard } from './AssetCard.js'
import { SelectInstrument } from './SelectInstrument.js'

export const HoldingsTab: React.FC = () => {
    const {
        status: { primaryParty, sessionToken },
    } = useConnection()
    const { listHoldings, tap } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const [holdings, setHoldings] = useState<Holding[] | undefined>(undefined)
    const [tapInstrument, setTapInstrument] = useState<
        { admin: string; id: string } | undefined
    >(undefined)
    const [tapAmount, setTapAmount] = useState<number>(10000)

    const refreshHoldings = useCallback(async () => {
        if (primaryParty) {
            const hs = await listHoldings({ party: primaryParty })
            setHoldings(hs)
        } else {
            setHoldings(undefined)
        }
    }, [primaryParty, listHoldings])

    useEffect(() => {
        refreshHoldings()
    }, [primaryParty, refreshHoldings])

    console.log('tapInstrument', tapInstrument)

    return (
        <div>
            <SelectInstrument
                value={tapInstrument}
                onChange={(e) => setTapInstrument(e)}
            />
            <input
                type="number"
                value={tapAmount}
                onChange={(e) => setTapAmount(Number(e.target.value))}
            />
            <button
                disabled={!sessionToken || !primaryParty || !tapInstrument}
                onClick={() => {
                    tap({
                        registryUrls,
                        party: primaryParty!,
                        sessionToken: sessionToken!,
                        instrumentId: tapInstrument!,
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
