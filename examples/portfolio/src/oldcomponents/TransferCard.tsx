// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import { type TransferInstructionView } from '@canton-network/core-tx-parser'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { useRegistryUrls } from '../contexts/RegistryServiceContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { AssetCard } from './AssetCard'

export type TransferCardProps = {
    party: PartyId
    contractId?: string // Not present in history
    transferInstructionView: TransferInstructionView
}

export const TransferCard: React.FC<TransferCardProps> = ({
    party,
    contractId,
    transferInstructionView,
}) => {
    const registryUrls = useRegistryUrls()
    const { exerciseTransfer } = usePortfolio()

    const transfer = transferInstructionView.transfer
    const status = transferInstructionView.status
    const { meta } = transfer
    const memo = meta.values[TokenStandardService.MEMO_KEY]

    // NOTE(jaspervdj): The types claim that the tag is in status.current.tag,
    // however, I have observed it to be in status.tag, so this is a bit of a
    // hack since I didn't get to the bottom of why they disagree.
    const tag = ('tag' in status ? status.tag : status.current?.tag) as
        | string
        | undefined

    return (
        <div>
            status: <strong>{tag}</strong> <br />
            sender: <strong>{transfer.sender}</strong> <br />
            receiver: <strong>{transfer.receiver}</strong> <br />
            {memo && (
                <span>
                    message: <strong>{memo}</strong> <br />
                </span>
            )}
            <AssetCard
                amount={transfer.amount}
                instrument={transfer.instrumentId}
            />
            {tag === 'TransferPendingReceiverAcceptance' &&
                transfer.receiver === party && (
                    <div>
                        <button
                            disabled={!contractId}
                            onClick={() => {
                                exerciseTransfer({
                                    registryUrls,
                                    party,
                                    contractId: contractId!,
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
                            disabled={!contractId}
                            onClick={() => {
                                exerciseTransfer({
                                    registryUrls,
                                    party,
                                    contractId: contractId!,
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
                            registryUrls,
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
