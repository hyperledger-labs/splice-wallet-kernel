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
const warnOnly = pino({ name: '01-party-stress', level: 'warn' })

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

const validatorOperatorParty = (await sdk.validator?.getValidatorUser()) || ''

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
function getRandomParty(): partyDefiniton {
    const rando = Math.floor(Math.random() * createdParties.length)
    return createdParties[rando]
}

async function tapAndTransfer(fromParty: partyDefiniton, count: number) {
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
                    const toParty = getRandomParty()
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
                        `[${fromParty.partyId}] Tap ${i} failed: ${error}`
                    )
                })
        } catch (error) {
            logger.error(
                `[${fromParty.partyId}] Transfer ${i} failed: ${error}`
            )
        }
    }
    logger.info(`[${fromParty.partyId}] completed ${count} transfers`)
}

logger.info('starting stress run')

//ensure the validator have enough funds
await sdk.setPartyId(validatorOperatorParty)

await sdk.tokenStandard?.createAndSubmitTapInternal(
    validatorOperatorParty,
    '2000000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrument.instrumentAdmin,
    }
)

const partiesPerInterval = process.env.PARTIES_PER_INTERVAL
    ? parseInt(process.env.PARTIES_PER_INTERVAL, 0)
    : 5
const intervalLengthMs = process.env.INTERVAL_LENGTH_MS
    ? parseInt(process.env.INTERVAL_LENGTH_MS, 0)
    : 20000
const transfersPerParty = process.env.TRANSFERS_PER_PARTY
    ? parseInt(process.env.TRANSFERS_PER_PARTY, 0)
    : 10

let currentInterval = 0

setInterval(async () => {
    try {
        currentInterval++
        logger.info(
            `[${currentInterval}] Starting allocation of ${partiesPerInterval} parties and ${transfersPerParty} transfers each`
        )
        for (let i = 1; i <= partiesPerInterval; i++) {
            allocateParty()
                .then(async (party) => {
                    await tapAndTransfer(party, transfersPerParty)
                })
                .catch((error) => {
                    logger.error(`Error allocating party: ${error}`)
                })
            await new Promise((resolve) =>
                setTimeout(resolve, partiesPerInterval / intervalLengthMs)
            )
        }
    } catch (error) {
        logger.error(`Error in interval ${currentInterval}: ${error}`)
    }
}, intervalLengthMs)

process.on('SIGINT', () => {
    logger.info('Caught interrupt signal, exiting...')
    process.exit()
})
