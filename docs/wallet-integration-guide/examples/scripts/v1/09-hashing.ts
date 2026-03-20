import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { TOKEN_PROVIDER_CONFIG_DEFAULT } from './utils/index.js'

const logger = pino({ name: 'v1-09-hashing', level: 'info' })

const sdk = await Sdk.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
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

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    sender.partyId,
    '10000'
)

await sdk.ledger
    .prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
    .sign(senderKeys.privateKey)
    .execute({ partyId: sender.partyId })
