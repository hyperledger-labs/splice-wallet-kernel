import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import type { TransferTestScriptParameters } from './types.js'

export default async (args: TransferTestScriptParameters) => {
    const { sdk, sender, receiver, senderKeys, receiverKeys, logger } = args

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
    logger.info(
        receiverPendingTransfers,
        'Receiver pending transfer instructions'
    )

    const [rejectCommand, rejectDisclosedContracts] =
        await sdk.token.v2.transfer.reject(
            receiverPendingTransfers[0].contractId,
            [receiver.partyId],
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        )

    await sdk.ledger
        .prepare({
            partyId: receiver.partyId,
            commands: rejectCommand,
            disclosedContracts: rejectDisclosedContracts,
        })
        .sign(receiverKeys.privateKey)
        .execute({ partyId: receiver.partyId })
    logger.info('Receiver rejected the transfer instruction')

    const pendingTransferAfterReject = await sdk.token.v2.transfer.pending(
        receiver.partyId
    )
    if (pendingTransferAfterReject.length)
        throw Error('pendingTransferAfterReject is not empty')

    logger.info('Successfully rejected the submitted transfer')
}
