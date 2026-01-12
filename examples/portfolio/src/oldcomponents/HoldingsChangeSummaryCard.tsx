// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { type HoldingsChangeSummary } from '@canton-network/core-ledger-client'
import { AssetCard } from './AssetCard'

interface HoldingsChangeSummaryCardProps {
    change: HoldingsChangeSummary
}

export const HoldingsChangeSummaryCard: React.FC<
    HoldingsChangeSummaryCardProps
> = ({ change }: HoldingsChangeSummaryCardProps) => {
    return (
        <span>
            In:
            <AssetCard
                instrument={change.instrumentId}
                amount={change.inputAmount}
            />
            , Out:
            <AssetCard
                instrument={change.instrumentId}
                amount={change.outputAmount}
            />
            , Change:
            <AssetCard
                instrument={change.instrumentId}
                amount={change.amountChange}
            />
        </span>
    )
}
