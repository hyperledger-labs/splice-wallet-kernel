import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

const logger = pino({ name: 'v1-two-step-transfer', level: 'info' })

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

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'alice',
    })
    .sign(aliceKeys.privateKey)
    .execute()

const bobKeys = sdk.keys.generate()

const bob = await sdk.party.external
    .create(bobKeys.publicKey, {
        partyHint: 'bob',
    })
    .sign(bobKeys.privateKey)
    .execute()

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    alice.partyId,
    '10000'
)

await (
    await sdk.ledger.prepare({
        partyId: alice.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
)
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

const aliceUtxos = await sdk.token.utxos({ partyId: alice.partyId })

const aliceAmuletUtxos = aliceUtxos.filter((utxo) => {
    return (
        utxo.interfaceViewValue.amount === '10000.0000000000' &&
        utxo.interfaceViewValue.instrumentId.id === 'Amulet'
    )
})

if (aliceAmuletUtxos.length === 0) {
    throw new Error('No UTXOs found for Alice')
}

const [transferCommand, transferDisclosedContracts] =
    await sdk.token.transfer.create({
        sender: alice.partyId,
        recipient: bob.partyId,
        amount: '2000',
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

logger.info('Transfer command created, ready for signing and execution')

await (
    await sdk.ledger.prepare({
        partyId: alice.partyId,
        commands: transferCommand,
        disclosedContracts: transferDisclosedContracts,
    })
)
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Submitted transfer command from Alice to Bob')

const bobPendingTransfers = await sdk.token.transfer.pending(bob.partyId)
logger.info(bobPendingTransfers, 'Bob pending transfer instructions')

const [acceptCommand, acceptDisclosedContracts] =
    await sdk.token.transfer.accept({
        transferInstructionCid: bobPendingTransfers[0].contractId,
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await (
    await sdk.ledger.prepare({
        partyId: bob.partyId,
        commands: acceptCommand,
        disclosedContracts: acceptDisclosedContracts,
    })
)
    .sign(bobKeys.privateKey)
    .execute({ partyId: bob.partyId })
logger.info('Bob accepted the transfer instruction')

const bobUtxos = await sdk.token.utxos({ partyId: bob.partyId })
logger.info(bobUtxos, 'Bob UTXOs after accepting transfer instruction')

const bobAmuletUtxos = bobUtxos.filter((utxo) => {
    return (
        utxo.interfaceViewValue.amount === '2000.0000000000' &&
        utxo.interfaceViewValue.instrumentId.id === 'Amulet'
    )
})

if (bobAmuletUtxos.length === 0) {
    throw new Error(
        'No Amulet UTXOs found for Bob after accepting transfer instruction'
    )
}

logger.info('Two step transfer process completed successfully')
