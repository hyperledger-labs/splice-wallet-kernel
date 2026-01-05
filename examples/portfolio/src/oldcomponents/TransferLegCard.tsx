// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type TransferLeg } from '@canton-network/core-token-standard'
import { AssetCard } from './AssetCard.js'

export type TransferLegCardProps = {
    transferLegId: string
    transferLeg: TransferLeg
}

export const TransferLegCard: React.FC<TransferLegCardProps> = ({
    transferLegId,
    transferLeg,
}) => {
    return (
        <div>
            <h3>Transfer leg {transferLegId}</h3>
            <strong>sender:</strong> {transferLeg.sender}
            <br />
            <strong>receiver:</strong> {transferLeg.receiver}
            <br />
            <AssetCard
                amount={transferLeg.amount}
                instrument={transferLeg.instrumentId}
            />
        </div>
    )
}
