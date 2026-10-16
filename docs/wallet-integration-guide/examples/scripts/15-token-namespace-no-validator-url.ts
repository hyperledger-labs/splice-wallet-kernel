import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'

import {
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
    TOKEN_NAMESPACE_CONFIG_SIMPLE,
} from './utils/index.js'

import { configureLogging } from './utils/configure-logging.js'
const logger = await configureLogging()

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    token: TOKEN_NAMESPACE_CONFIG_SIMPLE,
    amulet: AMULET_NAMESPACE_CONFIG,
})

const senderKeys = sdk.keys.generate()

const sender = await sdk.party.external
    .create(senderKeys.publicKey, {
        partyHint: 'v1-15-alice',
    })
    .sign(senderKeys.privateKey)
    .execute()

const senderFingerprint = await sdk.keys.fingerprint(senderKeys.publicKey)

logger.info({ sender, senderFingerprint }, 'Sender party representation:')

if (sender.publicKeyFingerprint !== senderFingerprint)
    throw Error('Inconsistent fingerprints')

const receiverKeys = sdk.keys.generate()

const receiver = await sdk.party.external
    .create(receiverKeys.publicKey, {
        partyHint: 'v1-15-bob',
    })
    .sign(receiverKeys.privateKey)
    .execute()

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    sender.partyId,
    '10000'
)

const result = await sdk.ledger
    .prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
    .sign(senderKeys.privateKey)
    .execute({ partyId: sender.partyId })

const senderUtxos = await sdk.token.utxos.list({ partyId: sender.partyId })

const tapTransaction = await sdk.token.transactionsById({
    updateId: result.updateId,
    partyId: sender.partyId,
})

const mintEvent = tapTransaction.events.find(
    (tokenStandardEvent) =>
        tokenStandardEvent.label.type === 'Mint' &&
        tokenStandardEvent.unlockedHoldingsChange.creates.find(
            (h) => h.amount === '10000.0000000000'
        )
)

if (mintEvent) {
    logger.info('Found token standard event with type Mint')
} else {
    throw new Error(`Couldn't find tap transaction by updateId`)
}
const senderAmuletUtxos = senderUtxos.filter((utxo) => {
    return (
        utxo.interfaceViewValue.amount === '10000.0000000000' &&
        utxo.interfaceViewValue.instrumentId.id === 'Amulet'
    )
})

if (senderAmuletUtxos.length === 0) {
    throw new Error('No UTXOs found for Sender')
}

logger.info('Tap command for Amulet for Sender submitted and UTXO received')

const [transferCommand, transferDisclosedContracts] =
    await sdk.token.transfer.create({
        sender: sender.partyId,
        recipient: receiver.partyId,
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
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

const receiverPendingTransfers = await sdk.token.transfer.pending(
    receiver.partyId
)
logger.info(receiverPendingTransfers, 'Receiver pending transfer instructions')

const [acceptCommand, acceptDisclosedContracts] =
    await sdk.token.transfer.accept({
        transferInstructionCid: receiverPendingTransfers[0].contractId,
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await sdk.ledger
    .prepare({
        partyId: receiver.partyId,
        commands: acceptCommand,
        disclosedContracts: acceptDisclosedContracts,
    })
    .sign(receiverKeys.privateKey)
    .execute({ partyId: receiver.partyId })
logger.info('Receiver accepted the transfer instruction')

const receiverUtxos = await sdk.token.utxos.list({
    partyId: receiver.partyId,
})
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

// Forcefully exit to prevent floating ledger retries from crashing the event loop
process.exit(0)
