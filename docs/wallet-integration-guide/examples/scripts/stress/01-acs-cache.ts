import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import { TOKEN_PROVIDER_CONFIG_DEFAULT } from '../utils/index.js'
import pino from 'pino'

const logger = pino({ name: 'stress-01-acs-cache', level: 'info' })

const partiesToCreate = parseInt(process.env.PARTIES_AMOUNT ?? '') || 25

const acsQueries =
    parseInt(process.env.ACS_QUERIES ?? '') || partiesToCreate * 5

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

const setupParty = async () => {
    const keys = sdk.keys.generate()

    const { partyId } = await sdk.party.external
        .create(keys.publicKey)
        .sign(keys.privateKey)
        .execute()

    const [pingCommand] = sdk.utils.ping.create([
        { initiator: partyId, responder: partyId },
    ])

    await sdk.ledger
        .prepare({
            commands: pingCommand,
            partyId,
        })
        .sign(keys.privateKey)
        .execute({
            partyId,
        })

    return { partyId, keys }
}

// Create parties in batches to avoid overwhelming the server
const parties = []
const batchSize = 5

logger.info(`Creating ${partiesToCreate} parties in batches of ${batchSize}...`)

for (let i = 0; i < partiesToCreate; i += batchSize) {
    const batch = Math.min(batchSize, partiesToCreate - i)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(partiesToCreate / batchSize)

    logger.info(
        `Creating batch ${batchNum}/${totalBatches} (${batch} parties)...`
    )

    const batchParties = await Promise.all(
        [...Array(batch)].map(() => setupParty())
    )
    parties.push(...batchParties)

    logger.info(
        `Batch ${batchNum}/${totalBatches} complete. Total parties: ${parties.length}`
    )
}

logger.info(`All ${parties.length} parties created successfully!`)

logger.info(`Executing ${acsQueries} ACS queries...`)
const startTime = Date.now()

for (let i = 0; i < acsQueries; ++i) {
    const randomParty = parties[Math.floor(Math.random() * parties.length)]

    // TODO: figure out why we have PERMISSION DENIED here

    await sdk.ledger.acs.read({
        parties: [randomParty.partyId],
        filterByParty: true,
        templateIds: [
            '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
        ],
    })

    if ((i + 1) % 10 === 0) {
        logger.info(`Completed ${i + 1}/${acsQueries} queries...`)
    }
}

const endTime = Date.now()
const totalTime = (endTime - startTime) / 1000
const avgTime = totalTime / acsQueries

logger.info(`Completed ${acsQueries} ACS queries`)
logger.info(`Total time: ${totalTime.toFixed(2)}s`)
logger.info(`Average time per query: ${avgTime.toFixed(3)}s`)
logger.info(`Queries per second: ${(acsQueries / totalTime).toFixed(2)}`)
