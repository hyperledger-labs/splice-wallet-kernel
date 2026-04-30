import pino from 'pino'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
} from '../utils/index.js'

const logger = pino({ name: 'v1-06-merge-utxos', level: 'info' })

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    token: TOKEN_NAMESPACE_CONFIG,
    amulet: AMULET_NAMESPACE_CONFIG,
})

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'v1-06-alice',
    })
    .sign(aliceKeys.privateKey)
    .execute()

// Mint holdings for alice

const TOTAL_TAPS = 115
const BATCH_SIZE = 10

const tapIndices = Array.from({ length: TOTAL_TAPS })

for (let i = 0; i < tapIndices.length; i += BATCH_SIZE) {
    const batch = tapIndices.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE)
    const batchEnd = Math.min(i + BATCH_SIZE, TOTAL_TAPS)
    logger.info(
        `Running tap batch  ${batchNumber}:${i + 1}=${batchEnd} of ${TOTAL_TAPS}`
    )

    const randomAmount = () => Math.floor(Math.random() * 1000) + 1000

    await Promise.all(
        batch.map(async () => {
            const [amuletTapCommand, amuletTapDisclosedContracts] =
                await sdk.amulet.tap(alice.partyId, randomAmount().toString())

            return sdk.ledger
                .prepare({
                    partyId: alice.partyId,
                    commands: amuletTapCommand,
                    disclosedContracts: amuletTapDisclosedContracts,
                })
                .sign(aliceKeys.privateKey)
                .execute({ partyId: alice.partyId })
        })
    )

    logger.info(`Tap batch ${batchNumber} complete`)
}

const utxosAlice = await sdk.token.utxos.list({
    partyId: alice.partyId,
})

logger.info(`number of unlocked utxos for alice ${utxosAlice.length}`)

const [mergeUtxoCommands, mergedDisclosedContracts] =
    await sdk.token.utxos.merge({
        partyId: alice.partyId,
    })

const mergePromises = mergeUtxoCommands.map((mergeCommand) => {
    return sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: mergeCommand,
            disclosedContracts: mergedDisclosedContracts,
        })
        .sign(aliceKeys.privateKey)
        .execute({ partyId: alice.partyId })
})

await Promise.all(mergePromises)

const utxosAliceMerged = await sdk.token.utxos.list({
    partyId: alice.partyId,
})

if (utxosAliceMerged.length === 2) {
    logger.info(`utxos successfully merged from ${utxosAlice.length} to 2`)
} else {
    throw new Error(`utxos not successfully merged`)
}
