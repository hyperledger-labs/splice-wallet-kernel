import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
    SignedTransaction,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { signTransactionHash } from '@canton-network/core-signing-lib'

const logger = pino({ name: 'v1-ping-localnet', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)

const sdk = await Sdk.create({
    authTokenProvider: new AuthTokenProvider(localNetAuth),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    logAdapter: 'pino',
})

const aliceKeys = sdk.keys.generate()
const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'aliceInWonderland',
    })
    .sign(aliceKeys.privateKey)
    .execute()

logger.info({ alice }, 'Alice party representation:')

// offline signing example
const bobKeys = await sdk.keys.generate()
const preparedBobParty = sdk.party.external.create(bobKeys.publicKey, {
    partyHint: 'bobTheBuilder',
})

const bobPartyData = await preparedBobParty.getParty()

const pingCommand = [
    {
        CreateCommand: {
            templateId:
                '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
            createArguments: {
                id: v4(),
                initiator: bobPartyData.partyId,
                responder: bobPartyData.partyId,
            },
        },
    },
]

console.log('BEFORE PREPARE')
const bobSignature = await sdk.ledger.prepare({
    partyId: bobPartyData.partyId,
    commands: pingCommand,
    disclosedContracts: [],
})

console.log('AFTER PREPARE')

const bob = await preparedBobParty.execute(bobSignature)

logger.info({ bob }, 'Bob party representation:')

throw 'YES'

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

logger.info('Tap command for Amulet for Alice submitted and UTXO received')
