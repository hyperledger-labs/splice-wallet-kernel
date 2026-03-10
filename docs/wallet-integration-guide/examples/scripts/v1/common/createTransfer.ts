import {
    localNetStaticConfig,
    Sdk,
    TransferParams,
} from '@canton-network/wallet-sdk'
import { createParties } from './createParties.js'
import pino from 'pino'
import { KeyPair } from '@canton-network/core-signing-lib'

export default async (args: {
    sdk: Sdk
    sender: Awaited<ReturnType<typeof createParties>>['sender']
    receiver: Awaited<ReturnType<typeof createParties>>['receiver']
    senderKeys: KeyPair
    logger: pino.Logger
    createCommandArgs?: Partial<TransferParams>
}) => {
    const { sdk, sender, receiver, senderKeys, logger, createCommandArgs } =
        args
    const [transferCommand, transferDisclosedContracts] =
        await sdk.token.transfer.create({
            sender: sender.partyId,
            recipient: receiver.partyId,
            instrumentId: 'Amulet',
            registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
            ...createCommandArgs,
            amount: createCommandArgs?.amount ?? '2000',
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
