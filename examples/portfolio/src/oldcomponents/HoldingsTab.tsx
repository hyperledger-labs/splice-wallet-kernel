// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState, useEffect } from 'react'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { type Holding } from '@canton-network/core-tx-parser'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { usePrimaryAccount } from '../hooks/useAccounts'
import { AssetCard } from './AssetCard'
import { SelectInstrument } from './SelectInstrument'

export const HoldingsTab: React.FC = () => {
    const sessionToken = useConnection().status?.session?.accessToken
    const primaryParty = usePrimaryAccount()?.partyId
    const { listHoldings, tap } = usePortfolio()
    const registryUrls = useRegistryUrls()
    const [holdings, setHoldings] = useState<Holding[] | undefined>(undefined)
    const [tapInstrument, setTapInstrument] = useState<
        { admin: string; id: string } | undefined
    >(undefined)
    const [tapAmount, setTapAmount] = useState<number>(10000)
    const currentTime = new Date()

    const refreshHoldings = useCallback(async () => {
        if (primaryParty) {
            const hs = await listHoldings({ party: primaryParty })
            setHoldings(hs)
        } else {
            setHoldings(undefined)
        }
    }, [primaryParty, listHoldings])

    useEffect(() => {
        let cancelled = false

        const fetchHoldings = async () => {
            if (primaryParty) {
                const hs = await listHoldings({ party: primaryParty })
                if (!cancelled) {
                    setHoldings(hs)
                }
            } else {
                setHoldings(undefined)
            }
        }

        void fetchHoldings()

        return () => {
            cancelled = true
        }
    }, [primaryParty, listHoldings])

    return (
        <div>
            <form onSubmit={(e) => e.preventDefault()} className="tap">
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
                    type="submit"
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
            </form>
            <ul>
                {holdings?.map((h) => {
                    return (
                        <li key={h.contractId}>
                            {TokenStandardService.isHoldingLocked(
                                h,
                                currentTime
                            ) && <span>🔒</span>}
                            <AssetCard
                                amount={h.amount}
                                instrument={h.instrumentId}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
