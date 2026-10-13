import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import type { TransferTestScriptParameters } from './types.js'

export default async (args: TransferTestScriptParameters) => {
    const { sdk, sender, receiver, senderKeys, logger } = args

    const [transferCommand, transferDisclosedContracts] =
        await sdk.token.v2.transfer.create({
            sender: sender.partyId,
            recipient: receiver.partyId,
            instrumentId: 'Amulet',
            registryUrl: new URL(
                localNetStaticConfig.LOCALNET_REGISTRY_API_URL
            ),
            amount: '2000',
        })

    logger.info('Transfer command created, ready for signing and execution')

    await sdk.ledger
        .prepare({
            partyId: sender.partyId,
            commands: transferCommand,
            disclosedContracts: transferDisclosedContracts,
        })
        .sign(senderKeys.privateKey)
        .execute({ partyId: sender.partyId })

    logger.info(
        { sender, receiver },
        'Submitted transfer command from Sender to Receiver'
    )
    const receiverPendingTransfers = await sdk.token.v2.transfer.pending(
        receiver.partyId
    )
    if (!receiverPendingTransfers.length)
        throw Error('receiverPendingTransfers is empty')

    logger.info(
        receiverPendingTransfers,
        'Receiver pending transfer instructions'
    )

    const [withdrawCommand, withdrawDisclosedContracts] =
        await sdk.token.v2.transfer.withdraw(
            receiverPendingTransfers[0].contractId,
            [sender.partyId],
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        )

    await sdk.ledger
        .prepare({
            partyId: sender.partyId,
            commands: withdrawCommand,
            disclosedContracts: withdrawDisclosedContracts,
        })
        .sign(senderKeys.privateKey)
        .execute({ partyId: sender.partyId })
    logger.info('Sender withdrew the transfer instruction')

    const pendingTransferAfterWithdraw = await sdk.token.v2.transfer.pending(
        receiver.partyId
    )
    if (pendingTransferAfterWithdraw.length)
        throw Error('pendingTransferAfterReject is not empty')

    logger.info('Successfully withdrawn the submitted transfer')
}
