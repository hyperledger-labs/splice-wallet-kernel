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

async function allocatePartiesParallel(count = 10000) {
    const results = new Array(count)
    const promises = []
    for (let i = 0; i < count; i++) {
        promises.push(
            (async () => {
                try {
                    const keyPair = createKeyPair()
                    const allocatedParty =
                        await sdk.userLedger?.signAndAllocateExternalParty(
                            keyPair.privateKey
                        )
                    results[i] = { success: true, value: allocatedParty }
                } catch (error) {
                    results[i] = { success: false, error }
                }
            })()
        )
    }
    await Promise.allSettled(promises)
    return results
}

//at approximately 50 we start seeing problem if we don't use expectHeavyLoad on allocation
const parallelCreationCount = 100
const allocationResults = await allocatePartiesParallel(parallelCreationCount)
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
