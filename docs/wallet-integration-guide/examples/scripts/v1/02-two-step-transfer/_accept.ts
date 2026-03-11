import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import createTransfer from './createTransfer.js'
import { TransferTestScriptParameters } from './types.js'

export default async (args: TransferTestScriptParameters) => {
    const { sdk, sender, receiver, senderKeys, receiverKeys, logger } = args

    await createTransfer({
        sdk,
        sender,
        receiver,
        senderKeys,
        logger,
    })

    const receiverPendingTransfers = await sdk.token.transfer.pending(
        receiver.partyId
    )
    logger.info(
        receiverPendingTransfers,
        'Receiver pending transfer instructions'
    )

    const [acceptCommand, acceptDisclosedContracts] =
        await sdk.token.transfer.accept({
            transferInstructionCid: receiverPendingTransfers[0].contractId,
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        })

    await (
        await sdk.ledger.prepare({
            partyId: receiver.partyId,
            commands: acceptCommand,
            disclosedContracts: acceptDisclosedContracts,
        })
    )
        .sign(receiverKeys.privateKey)
        .execute({ partyId: receiver.partyId })
    logger.info('Receiver accepted the transfer instruction')

    const receiverUtxos = await sdk.token.utxos({ partyId: receiver.partyId })
    logger.info(
        receiverUtxos,
        'Receiver UTXOs after accepting transfer instruction'
    )

    const receiverAmuletUtxos = receiverUtxos.filter((utxo) => {
        return (
            utxo.interfaceViewValue.amount === '2000.0000000000' &&
            utxo.interfaceViewValue.instrumentId.id === 'Amulet'
        )
    })

    if (receiverAmuletUtxos.length === 0) {
        throw new Error(
            'No Amulet UTXOs found for Receiver after accepting transfer instruction'
        )
    }

    logger.info('Two step transfer process completed successfully')
}
