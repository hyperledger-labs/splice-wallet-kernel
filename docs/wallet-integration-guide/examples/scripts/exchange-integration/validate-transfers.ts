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
    memoUUID: string | undefined,
    AmuletId: string,
    AmuletAdmin: PartyId
): boolean {
    // Type guard for TransferIn
    function isTransferIn(label: Label): label is TransferIn {
        return label.type === 'TransferIn'
    }

    return (
        transactions.filter((tx) =>
            tx.events.some(
                (event) =>
                    isTransferIn(event.label) &&
                    (!memoUUID ||
                        (event.label as TransferIn).reason === `${memoUUID}`) &&
                    (event.label as TransferIn).sender === sender &&
                    event.unlockedHoldingsChange?.creates.some(
                        (holding) =>
                            Number(holding.amount) === amount &&
                            holding.instrumentId.admin === AmuletAdmin &&
                            holding.instrumentId.id === AmuletId
                    )
            )
        ).length === 1
    ) // we filter and ensure length is exactly 1 to show no double spends exists
}

export function validateTransferOut(
    transactions: Transaction[],
    receiver: PartyId,
    amount: Number,
    memoUUID: string | undefined,
    AmuletId: string,
    AmuletAdmin: PartyId,
    isTwoStepTransfer: boolean = false
): boolean {
    // Type guard for TransferOut
    function isTransferOut(label: Label): label is TransferOut {
        return label.type === 'TransferOut'
    }

    return (
        transactions.filter((tx) =>
            tx.events.some(
                (event) =>
                    isTransferOut(event.label) &&
                    (!memoUUID ||
                        (event.label as TransferOut).reason ===
                            `${memoUUID}`) &&
                    (event.label as TransferOut).receiverAmounts.some(
                        (r) =>
                            r.receiver === receiver &&
                            Number(r.amount) === amount
                    ) &&
                    // if it is a one-step transfer we should see an unlocked holding change
                    (event.unlockedHoldingsChange?.archives.some(
                        (holding) =>
                            Number(holding.amount) === amount &&
                            holding.instrumentId.admin === AmuletAdmin &&
                            holding.instrumentId.id === AmuletId
                    ) ||
                        //if it is a two-step transfer we should see a locked holding change
                        event.lockedHoldingsChange?.archives.some(
                            (holding) =>
                                Number(holding.amount) === amount &&
                                holding.instrumentId.admin === AmuletAdmin &&
                                holding.instrumentId.id === AmuletId
                        ))
            )
        ).length === 1
    ) // we filter and ensure length is exactly 1 to show no double spends exists
}
