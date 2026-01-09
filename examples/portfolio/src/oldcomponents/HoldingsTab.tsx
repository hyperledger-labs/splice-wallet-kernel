// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useState, useEffect } from 'react'
import {
    TokenStandardService,
    type Holding,
} from '@canton-network/core-ledger-client'
import { useConnection } from '../contexts/ConnectionContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { usePrimaryAccount } from '../hooks/useAccounts'
import { AssetCard } from './AssetCard'
import { SelectInstrument } from './SelectInstrument'

export const HoldingsTab: React.FC = () => {
    const {
        status: { sessionToken },
    } = useConnection()
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
        refreshHoldings()
    }, [primaryParty, refreshHoldings])

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
