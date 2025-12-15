// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type Transfer } from '../utils/transfers'
import { useRegistries } from '../contexts/RegistriesContext.js'
import { usePortfolio } from '../contexts/PortfolioContext.js'
import { AssetCard } from './AssetCard.js'

export type TransferCardProps = {
    party: PartyId
    transfer: Transfer
}

export const TransferCard: React.FC<TransferCardProps> = ({
    party,
    transfer,
}) => {
    const { registries } = useRegistries()
    const { exerciseTransfer } = usePortfolio()
    return (
        <div>
            status: <strong>{transfer.status}</strong> <br />
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
            {transfer.status == 'pending' && transfer.incoming && (
                <div>
                    <button
                        onClick={() => {
                            exerciseTransfer({
                                registryUrls: registries,
                                party,
                                contractId: transfer.contractId,
                                instrumentId: transfer.instrumentId,
                                instructionChoice: 'Accept',
                            })
                            // TODO: callback on this card so we can refresh in a
                            // then?
                        }}
                    >
                        Accept
                    </button>
                    <button
                        onClick={() => {
                            exerciseTransfer({
                                registryUrls: registries,
                                party,
                                contractId: transfer.contractId,
                                instrumentId: transfer.instrumentId,
                                instructionChoice: 'Reject',
                            })
                        }}
                    >
                        Reject
                    </button>
                </div>
            )}
            {transfer.status == 'pending' && !transfer.incoming && (
                <button
                    onClick={() => {
                        exerciseTransfer({
                            registryUrls: registries,
                            party,
                            contractId: transfer.contractId,
                            instrumentId: transfer.instrumentId,
                            instructionChoice: 'Withdraw',
                        })
                    }}
                >
                    Withdraw
                </button>
            )}
        </div>
    )
}
