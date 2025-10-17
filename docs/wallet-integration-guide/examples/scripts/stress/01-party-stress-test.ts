import { PartyId } from '@canton-network/core-types'
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

const logger = pino({ name: '01-party-stress', level: 'info' })

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

type partyDefiniton = {
    keyPair: { publicKey: string; privateKey: string }
    partyId: PartyId
}

let createdParties: partyDefiniton[] = []
let allTransferCommandIds = []

const instrument = {
    instrumentId: 'Amulet',
    instrumentAdmin: (await sdk.tokenStandard?.getInstrumentAdmin()) || '',
}

async function allocatePartiesParallel(count: number, iterationAmount: number) {
    const results = new Array(count)
    const promises = []
    let completed = 0
    let lastCheck = 0
    for (let i = 1; i <= count; i++) {
        promises.push(
            (async () => {
                try {
                    const keyPair = createKeyPair()
                    const allocatedParty =
                        await sdk.userLedger?.signAndAllocateExternalParty(
                            keyPair.privateKey
                        )
                    results[i] = { success: true, value: allocatedParty }
                    createdParties.push({
                        keyPair,
                        partyId: allocatedParty!.partyId!,
                    })
                    completed++
                } catch (error) {
                    results[i] = { success: false, error }
                    completed++
                }
            })()
        )
        if (i % iterationAmount == 0 && i > 0) {
            logger.info(
                `created ${iterationAmount} more party promises, ${i} out of ${count}`
            )

            // Wait until 'completed' is a multiple of iterationAmount
            await new Promise((resolve) => {
                const check = () => {
                    const currentCheck = completed
                    if (
                        currentCheck % iterationAmount == 0 &&
                        currentCheck != lastCheck
                    ) {
                        lastCheck = currentCheck
                        logger.info(
                            `${currentCheck} out of ${count} party allocations have finished`
                        )
                        resolve(undefined)
                    } else {
                        setTimeout(check, 100)
                    }
                }
                check()
            })
        }
    }
    await Promise.allSettled(promises)
    return results
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min)) + min
}

async function tapAndTransfer(fromParty: partyDefiniton, count: number) {
    const transferSdk = new WalletSDKImpl().configure({
        logger: logger,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        topologyFactory: localNetTopologyDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })
    await sdk.connect()
    await sdk.connectAdmin()
    await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

    for (let i = 1; i <= count; i++) {
        try {
            const [tapCommand, disclosedContracts] =
                await sdk.tokenStandard!.createTap(
                    fromParty.partyId,
                    '100',
                    instrument
                )

            //we create a tap and then perform a transfer after it is complete
            sdk.userLedger
                ?.prepareSignExecuteAndWaitFor(
                    tapCommand,
                    fromParty.keyPair.privateKey,
                    v4(),
                    disclosedContracts
                )
                .then(async () => {
                    const rando = getRandomInt(0, createdParties.length)
                    const toParty = createdParties[rando]
                    const [command, dc] =
                        await sdk.tokenStandard!.createTransfer(
                            fromParty.partyId,
                            toParty.partyId,
                            '100',
                            instrument
                        )

                    const id = v4()
                    allTransferCommandIds.push(id)
                    await sdk.userLedger?.prepareSignAndExecuteTransaction(
                        command,
                        fromParty.keyPair.privateKey,
                        id,
                        dc
                    )
                })
        } catch (error) {
            logger.error(
                `[${fromParty.partyId}] Transfer ${i} failed: ${error}`
            )
        }
    }
}

//at approximately 50 we start seeing problem if we don't use expectHeavyLoad on allocation
const parallelCreationCount = 200
const iterationAmount = 50
logger.info(
    `starting simulation stress test for ${parallelCreationCount} user party creations`
)
const allocationResults = await allocatePartiesParallel(
    parallelCreationCount,
    iterationAmount
)
const successCount = allocationResults.filter((r) => r?.success).length
allocationResults.forEach((result, index) => {
    if (result) {
        if (result.success) {
            logger.info(
                `Party ${index} allocated: ${JSON.stringify(result.value)}`
            )
        } else {
            logger.error(`Party ${index} allocation failed: ${result.error}`)
        }
    } else {
        logger.error(`Party ${index} allocation resulted in undefined`)
    }
})
logger.info(
    `Requested ${parallelCreationCount}, Successfully allocated ${successCount}`
)
