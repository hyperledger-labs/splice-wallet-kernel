import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { getRandomElement, partyDefinition } from './utils.js'

const logger = pino({
    name: 'background-stress-load',
    level: process.env.BACKGROUND_STRESS_LOG_LEVEL ?? 'info',
})
const warnOnly = pino({
    name: 'background-stress-load',
    level: process.env.BACKGROUND_STRESS_LOG_LEVEL ?? 'warn',
})

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})
await sdk.connect()
await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

let createdParties: partyDefinition[] = []
let allTransferCommandIds = []

const instrument = {
    instrumentId: 'Amulet',
    instrumentAdmin: (await sdk.tokenStandard?.getInstrumentAdmin()) || '',
}

const validatorOperatorParty = (await sdk.validator?.getValidatorUser()) || ''

const participantId = await sdk.userLedger?.getParticipantId()

// Create a dedicated party for buying traffic
const trafficBuyerKeyPair = createKeyPair()
const trafficBuyer = await sdk.userLedger?.signAndAllocateExternalParty(
    trafficBuyerKeyPair.privateKey,
    'traffic-buyer'
)
logger.info(`Created traffic buyer party: ${trafficBuyer!.partyId}`)

async function buyTraffic(amount: number = 200000) {
    try {
        await sdk.setPartyId(trafficBuyer!.partyId)

        // Tap the traffic buyer party to ensure it has funds
        const [tapCommand, disclosedContracts] =
            await sdk.tokenStandard!.createTap(
                trafficBuyer!.partyId,
                '20000000',
                instrument
            )

        await sdk.userLedger?.prepareSignExecuteAndWaitFor(
            tapCommand,
            trafficBuyerKeyPair.privateKey,
            v4(),
            disclosedContracts
        )

        // Now buy traffic using the traffic buyer party
        const [buyTrafficCommand, buyTrafficDisclosedContracts] =
            await sdk.tokenStandard!.buyMemberTraffic(
                trafficBuyer!.partyId,
                amount,
                participantId!,
                []
            )

        await sdk.userLedger?.prepareSignExecuteAndWaitFor(
            buyTrafficCommand,
            trafficBuyerKeyPair.privateKey,
            v4(),
            buyTrafficDisclosedContracts
        )
        logger.info(`Bought ${amount} traffic for participant`)
    } catch (error) {
        logger.error({ error }, 'Error buying traffic')
    }
}

async function allocateParty() {
    const keyPair = createKeyPair()
    const allocatedParty = await sdk.userLedger?.signAndAllocateExternalParty(
        keyPair.privateKey
    )
    const definition = {
        keyPair,
        partyId: allocatedParty!.partyId,
    }

    createdParties.push(definition)

    return definition
}

async function tapAndTransfer(fromParty: partyDefinition, count: number) {
    const transferSdk = new WalletSDKImpl().configure({
        logger: warnOnly,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        topologyFactory: localNetTopologyDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })
    await transferSdk.connect()
    await transferSdk.connectAdmin()
    await transferSdk.connectTopology(
        localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
    )
    transferSdk.tokenStandard?.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )
    await transferSdk.setPartyId(fromParty.partyId)

    for (let i = 1; i <= count; i++) {
        try {
            const [tapCommand, disclosedContracts] =
                await transferSdk.tokenStandard!.createTap(
                    fromParty.partyId,
                    '100',
                    instrument
                )

            //we create a tap and then perform a transfer after it is complete
            transferSdk.userLedger
                ?.prepareSignExecuteAndWaitFor(
                    tapCommand,
                    fromParty.keyPair.privateKey,
                    v4(),
                    disclosedContracts
                )
                .then(async () => {
                    const toParty = getRandomElement(createdParties)!
                    const [command, dc] =
                        await transferSdk.tokenStandard!.createTransfer(
                            fromParty.partyId,
                            toParty.partyId,
                            '100',
                            instrument
                        )

                    const id = v4()
                    allTransferCommandIds.push(id)
                    await transferSdk.userLedger?.prepareSignAndExecuteTransaction(
                        command,
                        fromParty.keyPair.privateKey,
                        id,
                        dc
                    )
                })
                .catch((error) => {
                    logger.error(
                        { error },
                        `[${fromParty.partyId}] Tap ${i} failed`
                    )
                })
        } catch (error) {
            logger.error(
                { error },
                `[${fromParty.partyId}] Transfer ${i} failed`
            )
        }
    }
}

logger.info('starting stress run')

//ensure the validator have enough funds
await sdk.setPartyId(validatorOperatorParty)

await sdk.tokenStandard?.createAndSubmitTapInternal(
    validatorOperatorParty,
    '990000000000000000000000000', //upper limit
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrument.instrumentAdmin,
    }
)

//light config: 1, 5000, 5
// approximate TPS = (1 parties * 5 transfers) / 5 seconds = 1 TPS
//medium config: 3, 5000, 5
// approximate TPS = (3 parties * 5 transfers) / 5 seconds = 3 TPS
//heavy config: 5, 5000, 8
// approximate TPS = (5 parties * 8 transfers) / 5 seconds = 8 TPS
//extreme config: 4, 2000, 10
// approximate TPS = (4 parties * 10 transfers) / 2 seconds = 20 TPS

const partiesPerInterval = process.env.PARTIES_PER_INTERVAL
    ? parseInt(process.env.PARTIES_PER_INTERVAL, 0)
    : 3
const intervalLengthMs = process.env.INTERVAL_LENGTH_MS
    ? parseInt(process.env.INTERVAL_LENGTH_MS, 0)
    : 5000
const transfersPerParty = process.env.TRANSFERS_PER_PARTY
    ? parseInt(process.env.TRANSFERS_PER_PARTY, 0)
    : 5

let currentInterval = 0

// Buy traffic periodically to prevent running out
const trafficPurchaseIntervalMs = 30000

const trafficPurchaseAmount = 2000000

await buyTraffic(trafficPurchaseAmount)

setInterval(async () => {
    await buyTraffic(trafficPurchaseAmount)
}, trafficPurchaseIntervalMs)

setInterval(async () => {
    try {
        currentInterval++
        logger.info(
            `[${currentInterval}] Starting allocation of ${partiesPerInterval} parties and ${transfersPerParty} transfers each`
        )
        for (let i = 1; i <= partiesPerInterval; i++) {
            allocateParty()
                .then(async (party) => {
                    // Start a new interval for this party, limited to transfersPerParty times
                    let runCount = 0
                    const partyInterval = setInterval(async () => {
                        if (runCount >= transfersPerParty) {
                            clearInterval(partyInterval)
                            return
                        }
                        runCount++
                        await tapAndTransfer(party, 1)
                    }, intervalLengthMs)
                })
                .catch((error) => {
                    logger.error({ error }, 'Error allocating party')
                })
            await new Promise((resolve) =>
                setTimeout(resolve, partiesPerInterval / intervalLengthMs)
            )
        }
    } catch (error) {
        logger.error({ error }, `Error in interval ${currentInterval}`)
    }
}, intervalLengthMs)

process.on('SIGINT', () => {
    const cacheStats = sdk.userLedger?.getACSCacheStats()
    logger.info(cacheStats, `cache stats`)
    logger.info('Caught interrupt signal, exiting...')
    process.exit()
})
