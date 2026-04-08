import pino from 'pino'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
} from './utils/index.js'

const logger = pino({ name: 'v1-06-merge-utxos', level: 'info' })

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

const token = await sdk.token(TOKEN_NAMESPACE_CONFIG)

const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)

const aliceKeys = sdk.keys.generate()

// Discover the synchronizer where Amulet contracts live by building a tap command
// (this only fetches contracts from the registry/scan, no ledger submission)
const [, probeDisclosed] = await amulet.tap(
    'probe::0000000000000000000000000000000000000000000000000000000000000000',
    '1'
)
const synchronizerId = probeDisclosed[0]?.synchronizerId

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'v1-06-alice',
        ...(synchronizerId && { synchronizerId }),
    })
    .sign(aliceKeys.privateKey)
    .execute()

// Mint holdings for alice

const tapIndices = Array.from({ length: 15 })

const tapPromises = tapIndices.map(async () => {
    const [amuletTapCommand, amuletTapDisclosedContracts] = await amulet.tap(
        alice.partyId,
        '2000000'
    )

    const synchronizerId = amuletTapDisclosedContracts[0]?.synchronizerId

    return sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: amuletTapCommand,
            disclosedContracts: amuletTapDisclosedContracts,
            ...(synchronizerId && { synchronizerId }),
        })
        .sign(aliceKeys.privateKey)
        .execute({ partyId: alice.partyId })
})

await Promise.all(tapPromises)

const utxosAlice = await token.utxos.list({
    partyId: alice.partyId,
})

logger.info(`number of unlocked utxos for alice ${utxosAlice.length}`)

const [mergeUtxoCommands, mergedDisclosedContracts] = await token.utxos.merge({
    partyId: alice.partyId,
})

const mergePromises = mergeUtxoCommands.map((mergeCommand) => {
    const synchronizerId = mergedDisclosedContracts[0]?.synchronizerId

    return sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: mergeCommand,
            disclosedContracts: mergedDisclosedContracts,
            ...(synchronizerId && { synchronizerId }),
        })
        .sign(aliceKeys.privateKey)
        .execute({ partyId: alice.partyId })
})

await Promise.all(mergePromises)

const utxosAliceMerged = await token.utxos.list({
    partyId: alice.partyId,
})

if (utxosAliceMerged.length === 1) {
    logger.info(`utxos successfully merged from ${utxosAlice.length} to 1`)
} else {
    throw new Error(`utxos not successfully merged`)
}

// Test: fetch connected synchronizers for alice via sdk.ledger.state
const connectedSyncResponse = await sdk.ledger.state.connectedSynchronizers({
    party: alice.partyId,
})

if (
    connectedSyncResponse.connectedSynchronizers &&
    connectedSyncResponse.connectedSynchronizers.length > 0
) {
    logger.info(
        `connected synchronizers for alice: ${connectedSyncResponse.connectedSynchronizers.map((s) => s.synchronizerId).join(', ')}`
    )
} else {
    throw new Error('No connected synchronizers found for alice')
}
