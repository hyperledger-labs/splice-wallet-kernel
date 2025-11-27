import { useState, useEffect } from 'react'
import { AssetCard } from './AssetCard.js'
import { type Holding, getHoldings } from '../utils/getHoldings.js'
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

    const refreshHoldings = async () => {
        const hs = await getHoldings(party)
        setHoldings(hs)
    }

    useEffect(() => {
        refreshHoldings()
    }, [party])
    return (
        <div>
            <button
                disabled={!sessionToken}
                onClick={() => {
                    tap(party, sessionToken!).then(() => refreshHoldings())
                }}
            >
                TAP
            </button>
            <ul>
                {holdings?.map((h) => (
                    <li key={h.contractId}>
                        <AssetCard
                            name={h.name}
                            value={h.value}
                            symbol={h.symbol}
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}
