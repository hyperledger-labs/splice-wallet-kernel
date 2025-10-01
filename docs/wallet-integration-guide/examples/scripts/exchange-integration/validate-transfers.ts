import {
    Label,
    TransferIn,
    TransferOut,
    Transaction,
} from '@canton-network/core-ledger-client'
import { PartyId } from '@canton-network/core-types'

export function validateTransferIn(
    transactions: Transaction[],
    sender: PartyId,
    amount: Number,
    memoUUID: string,
    AmuletId: string,
    AmuletAdmin: PartyId
): boolean {
    // Type guard for TransferIn
    function isTransferIn(label: Label): label is TransferIn {
        return label.type === 'TransferIn'
    }

    return transactions.some((tx) =>
        tx.events.some(
            (event) =>
                isTransferIn(event.label) &&
                (event.label as TransferIn).reason === `${memoUUID}` &&
                (event.label as TransferIn).sender === sender &&
                event.unlockedHoldingsChange.creates.some(
                    (holding) =>
                        Number(holding.amount) === amount &&
                        holding.instrumentId.admin === AmuletAdmin &&
                        holding.instrumentId.id === AmuletId
                )
        )
    )
}

export function validateTransferOut(
    transactions: Transaction[],
    receiver: PartyId,
    amount: Number,
    memoUUID: string,
    AmuletId: string,
    AmuletAdmin: PartyId
): boolean {
    // Type guard for TransferOut
    function isTransferOut(label: Label): label is TransferOut {
        return label.type === 'TransferOut'
    }

    return transactions.some((tx) =>
        tx.events.some(
            (event) =>
                isTransferOut(event.label) &&
                (event.label as TransferOut).reason === `${memoUUID}` &&
                (event.label as TransferOut).receiverAmounts.some(
                    (r) =>
                        r.receiver === receiver && Number(r.amount) === amount
                ) &&
                event.unlockedHoldingsChange.archives.some(
                    (holding) =>
                        Number(holding.amount) === amount &&
                        holding.instrumentId.admin === AmuletAdmin &&
                        holding.instrumentId.id === AmuletId
                )
        )
    )
}
