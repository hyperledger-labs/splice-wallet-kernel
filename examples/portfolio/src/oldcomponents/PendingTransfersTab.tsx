// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { usePrimaryAccount } from '../hooks/useAccounts'
import { usePendingTransfers } from '../hooks/usePendingTransfers'
import { TransferCard } from './TransferCard'

export const PendingTransfersTab: React.FC = () => {
    const primaryParty = usePrimaryAccount()?.partyId
    const { data: pendingTransfers } = usePendingTransfers()

    return (
        <div>
            <h2>Pending transfers</h2>
            {primaryParty && (
                <ul>
                    {pendingTransfers?.map((p) => (
                        <li key={p.contractId}>
                            <TransferCard
                                party={primaryParty}
                                contractId={p.contractId}
                                transferInstructionView={p.interfaceViewValue}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
