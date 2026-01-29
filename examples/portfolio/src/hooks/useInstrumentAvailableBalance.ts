import type { InstrumentId } from '@canton-network/core-token-standard'
import type { AggregatedHolding } from '../utils/aggregate-holdings'
import { useAggregatedHoldings } from './useAggregatedHoldings'
import { useMemo } from 'react'

export const useInstrumentAvailableBalance = (
    partyId: string | undefined,
    instrumentId: InstrumentId | null
): AggregatedHolding | undefined => {
    const { instruments: aggregatedHoldings } = useAggregatedHoldings(partyId)

    return useMemo(() => {
        if (!instrumentId) return undefined
        return aggregatedHoldings.find(
            (h) =>
                h.instrumentId.admin === instrumentId.admin &&
                h.instrumentId.id === instrumentId.id
        )
    }, [aggregatedHoldings, instrumentId])
}
