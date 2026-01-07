// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type SettlementInfo } from '@canton-network/core-token-standard'

export type AllocationSettlementCardProps = {
    settlementInfo: SettlementInfo
}

export const AllocationSettlementCard: React.FC<
    AllocationSettlementCardProps
> = ({ settlementInfo: settlement }) => {
    return (
        <div>
            <h3>Settlement</h3>
            <strong>executor:</strong> {settlement.executor}
            <br />
            <strong>allocateBefore:</strong> {settlement.allocateBefore}
            {new Date(settlement.allocateBefore) <= new Date() && '(EXPIRED!)'}
            <br />
        </div>
    )
}
