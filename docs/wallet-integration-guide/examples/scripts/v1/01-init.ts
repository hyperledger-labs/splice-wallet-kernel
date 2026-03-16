import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { signTransactionHash } from '@canton-network/core-signing-lib'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const logger = pino({ name: 'v1-01-ping-localnet', level: 'info' })

const authTokenProvider = new AuthTokenProvider(
    {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    logger
)

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const senderKeys = sdk.keys.generate()

const sender = await sdk.party.external
    .create(senderKeys.publicKey, {
        partyHint: 'alice',
    })
    .sign(senderKeys.privateKey)
    .execute()

logger.info({ sender }, 'Sender party representation:')

const receiverKeys = sdk.keys.generate()

const recieverPartyCreation = await sdk.party.external.create(
    receiverKeys.publicKey,
    {
        partyHint: 'bob',
    }
)

const unsignedReceiver = await recieverPartyCreation.topology()

// external signing simulation
const receiverPartySignature = signTransactionHash(
    unsignedReceiver.multiHash,
    receiverKeys.privateKey
)

const signedReceiverParty = await recieverPartyCreation.execute(
    receiverPartySignature
)

logger.info({ signedReceiverParty }, 'Receiver party representation:')

const pingCommand = [
    {
        CreateCommand: {
            templateId:
                '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
            createArguments: {
                id: v4(),
                initiator: sender.partyId,
                responder: sender.partyId,
            },
        },
    },
]

logger.info({ pingCommand }, 'Ping command to be submitted:')

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: pingCommand,
        disclosedContracts: [],
    })
)
    .sign(senderKeys.privateKey)
    .execute({ partyId: sender.partyId })

logger.info('Ping command submitted with online signing')

/*
offline signing example
*/

const preparedPingCommand = await sdk.ledger.prepare({
    partyId: sender.partyId,
    commands: pingCommand,
    disclosedContracts: [],
}).preparedPromise

logger.info({ preparedPingCommand }, 'Prepared ping command:')

/*
Note: The following code uses the @canton-network/core-signing-lib as the 'custodian' of the private key to sign the prepared transaction hash,
but in a real scenario, the signing could be done using any compatible signing mechanism, such as a hardware wallet or an external signing service.
*/
const signature = signTransactionHash(
    preparedPingCommand.preparedTransactionHash,
    senderKeys.privateKey
)

const signed = sdk.ledger.fromSignature(preparedPingCommand, signature)

await sdk.ledger.execute(signed, { partyId: sender.partyId })

logger.info('Ping command submitted with offline signing')

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

logger.info('Tap command for Amulet for Sender submitted and UTXO received')
