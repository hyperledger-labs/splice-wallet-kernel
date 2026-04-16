import {
    localNetStaticConfig,
    SDK,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { TOKEN_NAMESPACE_CONFIG } from '../utils/index.js'
import { KeyPair } from '@canton-network/core-signing-lib'
import { PartyId } from '@canton-network/core-types'

type PartyDefinition = {
    keyPair: KeyPair
    partyId: PartyId
}

const logger = pino({
    name: 'background-stress-load',
    level: process.env.BACKGROUND_STRESS_LOG_LEVEL ?? 'info',
})

const warnOnly = pino({
    name: 'background-stress-load',
    level: process.env.BACKGROUND_STRESS_LOG_LEVEL ?? 'warn',
})

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

const token = await sdk.token(TOKEN_NAMESPACE_CONFIG)
const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)

let createdParties: PartyDefinition[] = []
let allTransferCommandIds = []

//create dedicated party for buying traffic
const trafficBuyerKeys = sdk.keys.generate()
const trafficBuyer = await sdk.party.external
    .create(trafficBuyerKeys.publicKey, {
        partyHint: 'stress-traffic-buyer',
    })
    .sign(trafficBuyerKeys.privateKey)
    .execute()

logger.info(`Created traffic buyer party: ${trafficBuyer.partyId}`)

async function buyTraffic(amount: number = 20020000000) {
    // Tap the traffic buyer party to ensure it has funds
    const [amuletTapCommand, amuletTapDisclosedContracts] = await amulet.tap(
        trafficBuyer.partyId,
        '2000000'
    )

    await sdk.ledger
        .prepare({
            partyId: trafficBuyer.partyId,
            commands: amuletTapCommand,
            disclosedContracts: amuletTapDisclosedContracts,
        })
        .sign(trafficBuyerKeys.privateKey)
        .execute({
            partyId: trafficBuyer.partyId,
        })

    const [buyTrafficCommand, buyTrafficDisclosedContracts] =
        await amulet.traffic.buy({
            buyer: trafficBuyer.partyId,
            ccAmount: amount,
            inputUtxos: [],
        })

    await sdk.ledger
        .prepare({
            partyId: trafficBuyer.partyId,
            commands: buyTrafficCommand,
            disclosedContracts: buyTrafficDisclosedContracts,
        })
        .sign(trafficBuyerKeys.privateKey)
        .execute({
            partyId: trafficBuyer.partyId,
        })

    logger.info(`Bought ${amount} traffic for participant`)
}

function getRandomElement<T>(arr: T[]): T | undefined {
    if (arr.length === 0) {
        return undefined // Return undefined for an empty array
    }
    const randomIndex = Math.floor(Math.random() * arr.length)
    return arr[randomIndex]
}

async function allocateParty(): Promise<PartyDefinition> {
    const keyPair = sdk.keys.generate()
    const allocatedParty = await sdk.party.external
        .create(keyPair.publicKey)
        .sign(keyPair.privateKey)
        .execute()

    const createdParty = {
        keyPair,
        partyId: allocatedParty.partyId,
    }
    createdParties.push(createdParty)
    return createdParty
}
async function tapAndTransfer(fromParty: PartyDefinition, count: number) {
    const transferSdk = await SDK.create({
        auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const token = await sdk.token(TOKEN_NAMESPACE_CONFIG)
    const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)

    for (let i = 1; i <= count; i++) {
        try {
            const [amuletTapCommand, amuletTapDisclosedContracts] =
                await amulet.tap(fromParty.partyId, '2000000')
            await transferSdk.ledger
                .prepare({
                    partyId: fromParty.partyId,
                    commands: amuletTapCommand,
                    disclosedContracts: amuletTapDisclosedContracts,
                })
                .sign(fromParty.keyPair.privateKey)
                .execute({
                    partyId: fromParty.partyId,
                })
                .then(async () => {
                    const toParty = getRandomElement(createdParties)!
                    const [transferCommand, transferDc] =
                        await token.transfer.create({
                            sender: fromParty.partyId,
                            recipient: toParty.partyId,
                            amount: '100',
                            instrumentId: 'Amulet',
                            registryUrl:
                                localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
                        })

                    await transferSdk.ledger
                        .prepare({
                            partyId: fromParty.partyId,
                            commands: transferCommand,
                            disclosedContracts: transferDc,
                        })
                        .sign(fromParty.keyPair.privateKey)
                        .execute({
                            partyId: fromParty.partyId,
                        })
                })
        } catch (e) {
            logger.error({ e }, `[${fromParty.partyId}] Transfer ${i} failed`)
        }
    }
}

logger.info('starting stress run')

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
    : 7500
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
