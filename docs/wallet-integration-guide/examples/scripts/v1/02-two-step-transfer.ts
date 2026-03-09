import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { createParties } from './fixtures/parties.js'

const logger = pino({ name: 'v1-02-two-step-transfer', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)

const sdk = await Sdk.create({
    logAdapter: 'pino',
    authTokenProvider: new AuthTokenProvider(localNetAuth),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const { sender, receiver, senderKeys, receiverKeys } = await createParties(sdk)

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    sender.partyId,
    '10000'
)

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
)
    .sign(senderKeys.privateKey)
    .execute({ partyId: sender.partyId })

const senderUtxos = await sdk.token.utxos({ partyId: sender.partyId })

const senderAmuletUtxos = senderUtxos.filter((utxo) => {
    return (
        utxo.interfaceViewValue.amount === '10000.0000000000' &&
        utxo.interfaceViewValue.instrumentId.id === 'Amulet'
    )
})

if (senderAmuletUtxos.length === 0) {
    throw new Error('No UTXOs found for Sender')
}

const [transferCommand, transferDisclosedContracts] =
    await sdk.token.transfer.create({
        sender: sender.partyId,
        recipient: receiver.partyId,
        amount: '2000',
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

logger.info('Submitted transfer command from Sender to Receiver')

const receiverPendingTransfers = await sdk.token.transfer.pending(
    receiver.partyId
)
logger.info(receiverPendingTransfers, 'Receiver pending transfer instructions')

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
