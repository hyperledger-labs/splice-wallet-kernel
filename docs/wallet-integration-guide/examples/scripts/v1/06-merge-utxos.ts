import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const logger = pino({ name: 'v1-06-merge-utxos', level: 'info' })

const authTokenProvider = new AuthTokenProvider(
    {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    logger
)

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'alice',
    })
    .sign(aliceKeys.privateKey)
    .execute()

// Mint holdings for alice

const tapIndices = Array.from({ length: 15 })

const tapPromises = tapIndices.map(async () => {
    const [amuletTapCommand, amuletTapDisclosedContracts] =
        await sdk.amulet.tap(alice.partyId, '2000000')

    return sdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: amuletTapCommand,
            disclosedContracts: amuletTapDisclosedContracts,
        })
        .sign(aliceKeys.privateKey)
        .execute({ partyId: alice.partyId })
})

await Promise.all(tapPromises)

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

if (utxosAliceMerged.length === 1) {
    logger.info(`utxos successfuly merged from ${utxosAlice.length} to 1`)
} else {
    throw new Error(`utxos not successfully merged`)
}
