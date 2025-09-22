import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerAppProvider,
    localNetTokenStandardDefault,
    localNetTopologyAppProvider,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { LOCALNET_VALIDATOR_APP_PROVIDER_URL } from '../config.js'

const logger = pino({ name: '07-one-step-deposit', level: 'info' })

const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerAppProvider,
    topologyFactory: localNetTopologyAppProvider,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

await sdk.connectAdmin()
const exchangeSuffix = Math.floor(Math.random() * 10000)
const exchangeParty = (
    await sdk.adminLedger!.allocateInternalParty(`exchangeId_${exchangeSuffix}`)
).partyDetails!.party

logger.info(`Created exchange party: ${exchangeParty}`)

await sdk.connectTopology(LOCALNET_VALIDATOR_APP_PROVIDER_URL)
const treasuryKeyPair = createKeyPair()
const treasuryParty = (
    await sdk.topology?.prepareSignAndSubmitExternalParty(
        treasuryKeyPair.privateKey,
        'treasury'
    )
)?.partyId

logger.info(`Created treasury party: ${treasuryParty}`)
