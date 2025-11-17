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

const logger = pino({ name: '03-stress test', level: 'info' })

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

const keyPairAlice = createKeyPair()

const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairAlice.privateKey,
    'alice'
)
logger.info(`Created party: ${alice!.partyId}`)
await sdk.setPartyId(alice!.partyId)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

const BATCH_SIZE = 10 // Number of concurrent promises per batch
const MAX_RETRIES = 3 // Max number of retries per failed promise
const RETRY_DELAY = 1000 // Delay between retries in milliseconds

const delay = (ms: number | undefined) =>
    new Promise((resolve) => setTimeout(resolve, ms))

const retryPromise = async (
    fn: { (): Promise<void>; (): any },
    retries = MAX_RETRIES
) => {
    try {
        return await fn()
    } catch (error) {
        if (retries > 0) {
            console.log(
                `Retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`
            )
            await delay(RETRY_DELAY) // Wait before retrying
            return retryPromise(fn, retries - 1)
        } else {
            throw error // If no retries left, throw the error
        }
    }
}

const processCreateTap = async () => {
    const [tapCommand2, disclosedContracts2] =
        await sdk.tokenStandard!.createTap(alice!.partyId, '100', {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        })

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        tapCommand2,
        keyPairAlice.privateKey,
        v4(),
        disclosedContracts2
    )
}

// Function to process the iterations in batches with retry logic
const processTapInBatches = async (totalIterations: number) => {
    let results: any[] = []

    // Split the total iterations into batches
    for (let i = 0; i < totalIterations; i += BATCH_SIZE) {
        const batchPromises = []

        // Prepare the promises for this batch
        for (let j = i; j < i + BATCH_SIZE && j < totalIterations; j++) {
            batchPromises.push(retryPromise(processCreateTap)) // Wrap each iteration with retry logic
        }

        // Wait for all promises in this batch to resolve
        const batchResults = await Promise.all(batchPromises)
        results = results.concat(batchResults)

        console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} processed.`)
    }

    return results
}

await processTapInBatches(150)

const utxosAlice = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(`number of unlocked utxos for alice ${utxosAlice?.length}`)

const [commands, mergedDisclosedContracts] =
    await sdk.tokenStandard?.mergeHoldingUtxos({
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    })!

/*
can't have more than 100 transfers per execute, so we have to submit in batches
each command contains up to 100 transfers
*/

// for (let i = 0; i < commands.length; i++) {
//     await sdk.userLedger?.prepareSignExecuteAndWaitFor(
//         commands[i],
//         keyPairAlice.privateKey,
//         v4(),
//         mergedDisclosedContracts
//     )
// }

await sdk.userLedger?.prepareSignExecuteAndWaitForSequentialCommandSubmission(
    commands,
    keyPairAlice.privateKey,
    v4(),
    mergedDisclosedContracts
)

const utxosAliceMerged = await sdk.tokenStandard?.listHoldingUtxos(false)!

logger.info(
    `reduced utxos from ${utxosAlice?.length} to ${utxosAliceMerged.length}`
)
