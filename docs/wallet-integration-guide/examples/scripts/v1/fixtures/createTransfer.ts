import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { createParties } from './createParties.js'
import pino from 'pino'
import { KeyPair } from '@canton-network/core-signing-lib'

export default async (args: {
    sdk: Sdk
    sender: Awaited<ReturnType<typeof createParties>>['sender']
    receiver: Awaited<ReturnType<typeof createParties>>['receiver']
    senderKeys: KeyPair
    amount?: number
    logger: pino.Logger
}) => {
    const { sdk, sender, receiver, amount = 2000, senderKeys, logger } = args
    const [transferCommand, transferDisclosedContracts] =
        await sdk.token.transfer.create({
            sender: sender.partyId,
            recipient: receiver.partyId,
            amount: amount.toString(),
            instrumentId: 'Amulet',
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        })

    logger.info('Transfer command created, ready for signing and execution')

    await (
        await sdk.ledger.prepare({
            partyId: sender.partyId,
            commands: transferCommand,
            disclosedContracts: transferDisclosedContracts,
        })
    )
        .sign(senderKeys.privateKey)
        .execute({ partyId: sender.partyId })

    logger.info(
        { sender, receiver },
        'Submitted transfer command from Sender to Receiver'
    )
}
