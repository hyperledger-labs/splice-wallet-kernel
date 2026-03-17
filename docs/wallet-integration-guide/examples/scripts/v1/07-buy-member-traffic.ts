import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const logger = pino({ name: 'v1-06-merge-utxos', level: 'info' })

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
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
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

const createPreapprovalCommand = await sdk.amulet.preapproval.command.create({
    parties: {
        receiver: bob.partyId,
    },
})

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: createPreapprovalCommand,
    })
    .sign(bobKeys.privateKey)
    .execute({
        partyId: bob.partyId,
    })

// Mint holdings for alice

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    alice.partyId,
    '2000000'
)

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info(`Tapped holdings for alice`)

const trafficStatusBeforePurchase = await sdk.amulet.traffic.status({})

logger.info(`Traffic status before purchase: ${trafficStatusBeforePurchase}`)

const [buyTrafficCommand, buyTrafficDisclosedContracts] =
    await sdk.amulet.traffic.buy({
        buyer: alice.partyId,
        ccAmount: 200000,
        inputUtxos: [],
    })

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: buyTrafficCommand,
        disclosedContracts: buyTrafficDisclosedContracts,
    })
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info(`buy member traffic for sender (${alice.partyId}) party completed`)

const trafficStatusAfterPurchase = await sdk.amulet.traffic.status({})

const utxos = await sdk.token.utxos.list({ partyId: alice.partyId })
logger.info(utxos, 'alice utxos')

const sentValue = 2000

const [transferCommand, transferDisclosedContracts] =
    await sdk.token.transfer.create({
        sender: alice.partyId,
        recipient: bob.partyId,
        amount: sentValue.toString(),
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: transferCommand,
        disclosedContracts: transferDisclosedContracts,
    })
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

await new Promise((resolve) => setTimeout(resolve, 61_000))

const trafficStatusAfterPurchaseAndSomeTime = await sdk.amulet.traffic.status(
    {}
)

logger.info(
    {
        trafficStatusBeforePurchase,
        trafficStatusAfterPurchase,
        trafficStatusAfterPurchaseAndSomeTime,
    },
    'MemberTraffic status'
)
