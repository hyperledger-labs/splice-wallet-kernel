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

const bobKeys = sdk.keys.generate()
const bobPartyCreation = await sdk.party.external.create(bobKeys.publicKey, {
    partyHint: 'bobTheBuilder',
})

const unsignedBob = await bobPartyCreation.topology()

// external signing simulation
const bobPartySignature = signTransactionHash(
    unsignedBob.multiHash,
    bobKeys.privateKey
)

const signedBobParty = await bobPartyCreation.execute(bobPartySignature)

logger.info({ signedBobParty }, 'Bob party representation:')

const pingCommand = [
    {
        CreateCommand: {
            templateId:
                '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
            createArguments: {
                id: v4(),
                initiator: alice.partyId,
                responder: alice.partyId,
            },
        },
    },
]

logger.info({ pingCommand }, 'Ping command to be submitted:')

await (
    await sdk.ledger.prepare({
        partyId: alice.partyId,
        commands: pingCommand,
        disclosedContracts: [],
    })
)
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info('Ping command submitted with online signing')

/*
offline signing example
*/

const preparedPingCommand = await sdk.ledger.prepare({
    partyId: alice.partyId,
    commands: pingCommand,
    disclosedContracts: [],
})

logger.info({ preparedPingCommand }, 'Prepared ping command:')

/*
Note: The following code uses the @canton-network/core-signing-lib as the 'custodian' of the private key to sign the prepared transaction hash,
but in a real scenario, the signing could be done using any compatible signing mechanism, such as a hardware wallet or an external signing service.
*/
const signature = signTransactionHash(
    preparedPingCommand.response.preparedTransactionHash,
    aliceKeys.privateKey
)

const signed = sdk.ledger.fromSignature(preparedPingCommand.response, signature)

await sdk.ledger.execute(signed, { partyId: alice.partyId })

logger.info('Ping command submitted with offline signing')

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

logger.info('Tap command for Amulet for Alice submitted and UTXO received')
