// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type Transfer, acceptTransfer } from '../utils/transfers'
import { AssetCard } from './AssetCard.js'

export type TransferCardProps = {
    registryUrls: Map<PartyId, string>
    party: PartyId
    transfer: Transfer
}

export const TransferCard: React.FC<TransferCardProps> = ({
    registryUrls,
    party,
    transfer,
}) => {
    return (
        <div>
            sender: <strong>{transfer.sender}</strong> <br />
            receiver: <strong>{transfer.receiver}</strong> <br />
            {transfer.memo && (
                <span>
                    message: <strong>{transfer.memo}</strong> <br />
                </span>
            )}
            <AssetCard
                amount={transfer.amount}
                symbol={transfer.instrumentId.id}
            />
            {transfer.state == 'pending' && transfer.incoming && (
                <button
                    onClick={() => {
                        acceptTransfer({
                            registryUrls,
                            party,
                            contractId: transfer.contractId,
                            instrumentId: transfer.instrumentId,
                        })
                        // TODO: callback on this card so we can refresh in a
                        // then?
                    }}
                >
                    Accept
                </button>
            )}
        </div>
    )
}
