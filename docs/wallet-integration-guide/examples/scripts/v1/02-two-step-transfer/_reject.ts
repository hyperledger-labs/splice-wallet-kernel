import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import createTransfer from '../common/createTransfer.js'
import { TransferTestScriptParameters } from './types.js'

export default async (args: TransferTestScriptParameters) => {
    const { sdk, receiver, sender, senderKeys, receiverKeys, logger } = args
    await createTransfer({
        sdk,
        receiver,
        sender,
        logger,
        senderKeys,
    })

    const pendingTransfer = await sdk.token.transfer.pending(receiver.partyId)

    if (!pendingTransfer.length) throw Error('pendingTransfer is empty')

    const [rejectCommand, rejectDisclosedContracts] =
        await sdk.token.transfer.reject({
            transferInstructionCid: pendingTransfer[0].contractId,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        })

    await (
        await sdk.ledger.prepare({
            partyId: receiver.partyId,
            commands: rejectCommand,
            disclosedContracts: rejectDisclosedContracts,
        })
    )
        .sign(receiverKeys.privateKey)
        .execute({
            partyId: receiver.partyId,
        })

    const pendingTransferAfterReject = await sdk.token.transfer.pending(
        receiver.partyId
    )
    if (pendingTransferAfterReject.length)
        throw Error('pendingTransferAfterReject is not empty')

    logger.info('Successfully rejected the submitted transfer')
}
