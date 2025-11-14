import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
    WalletSDK,
} from '@canton-network/wallet-sdk'
import { partyDefinition, getRandomElement, parallelize } from './utils.js'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '02-stress test', level: 'info' })

type testConfig = {
    partiesToCreate: number
    queriesToAttempt: number
}

const partiesToCreate = process.env.PARTIES_PER_INTERVAL
    ? parseInt(process.env.PARTIES_PER_INTERVAL, 0)
    : 25
const acsQueries = process.env.ACS_QUERIES
    ? parseInt(process.env.ACS_QUERIES, 0)
    : partiesToCreate * 5

let createdParties: partyDefinition[] = []

const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localValidatorDefault,
})

logger.debug('SDK initialized')

await sdk.connect()
logger.debug('Connected to ledger')

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

async function setUpParty(parties: partyDefinition[], sdk: WalletSDK) {
    const keyPair = createKeyPair()

    const allocatedParty = await sdk.userLedger?.signAndAllocateExternalParty(
        keyPair.privateKey
    )
    logger.debug(
        { partyId: allocatedParty?.partyId! },
        'created single hosted party to get synchronzerId'
    )
    await sdk.setPartyId(allocatedParty?.partyId!)

    logger.debug('Create ping command')
    const createPingCommand = sdk.userLedger?.createPingCommand(
        allocatedParty!.partyId!
    )

    logger.debug('Prepare command submission for ping create command')

    const pingCommandResponse =
        await sdk.userLedger?.prepareSignExecuteAndWaitFor(
            createPingCommand,
            keyPair.privateKey,
            v4()
        )
    logger.debug(pingCommandResponse, 'ping command response')

    parties.push({
        keyPair,
        partyId: allocatedParty!.partyId,
    })
}

await parallelize(partiesToCreate, () => setUpParty(createdParties, sdk))

logger.info(createdParties.length, `parties created`)

const legerEnd = await sdk.userLedger?.ledgerEnd()

for (let i = 0; i < acsQueries; i++) {
    const party = getRandomElement(createdParties)

    try {
        await sdk.userLedger?.activeContracts({
            offset: legerEnd?.offset!,
            filterByParty: true,
            parties: [party?.partyId!],
            templateIds: [
                '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
            ],
        })
    } catch (e) {
        logger.error(e)
    }
}

const cacheStats = sdk.userLedger?.getACSCacheStats()

logger.info(cacheStats, `cache stats`)
