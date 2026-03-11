import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import createTransfer from './createTransfer.js'
import { TransferTestScriptParameters } from './types.js'

export default async (args: TransferTestScriptParameters) => {
    const { sdk, receiver, sender, senderKeys, logger } = args
    await createTransfer({
        sdk,
        receiver,
        sender,
        logger,
        senderKeys,
    })

    const pendingTransfer = await sdk.token.transfer.pending(receiver.partyId)

    if (!pendingTransfer.length) throw Error('pendingTransfer is empty')

    const [withdrawCommand, withdrawDisclosedContracts] =
        await sdk.token.transfer.withdraw({
            transferInstructionCid: pendingTransfer[0].contractId,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        })

    await (
        await sdk.ledger.prepare({
            partyId: sender.partyId,
            commands: withdrawCommand,
            disclosedContracts: withdrawDisclosedContracts,
        })
    )
        .sign(senderKeys.privateKey)
        .execute({
            partyId: sender.partyId,
        })

    const pendingTransferAfterWithdraw = await sdk.token.transfer.pending(
        receiver.partyId
    )
    if (pendingTransferAfterWithdraw.length)
        throw Error('pendingTransferAfterWithdraw is not empty')

    logger.info('Successfully withdrawn the submitted transfer')
}
