import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { KeyPair } from '@canton-network/core-signing-lib'

const logger = pino({ name: 'v1-token-standard-allocation', level: 'info' })

type PartyInfo = {
    partyId: string
    publicKeyFingerprint: string
    topologyTransactions?: string[] | undefined
    multiHash: string
    keyPair: KeyPair
}

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

const isAdmin = true

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    isAdmin,
})

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET = '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

try {
    const darBytes = await fs.readFile(tradingDarPath)
    await sdk.ledger.dar.upload(darBytes, TRADING_APP_PACKAGE_ID)
    logger.info(
        'Trading app DAR ensured on participant (uploaded or already present)'
    )
} catch (e) {
    logger.error(
        { e, tradingDarPath },
        'Failed to ensure trading app DAR uploaded'
    )
    throw e
}

//TODO: add token standard allocation example here
const allocatedParties = await Promise.all(
    ['alice', 'bob', 'venue'].map(async (partyHint) => {
        const partyKeys = sdk.keys.generate()
        const party = await sdk.party.external
            .create(partyKeys.publicKey, {
                partyHint,
            })
            .sign(partyKeys.privateKey)
            .execute()

        return [
            partyHint,
            {
                partyId: party.partyId,
                publicKeyFingerprint: party.publicKeyFingerprint,
                multiHash: party.multiHash,
                topologyTransactions: party.topologyTransactions,
                keyPair: partyKeys,
            },
        ] as const
    })
)

const partyInfo: Map<string, PartyInfo> = new Map(allocatedParties)

const sender = partyInfo.get('alice')!
const recipient = partyInfo.get('bob')!
const venue = partyInfo.get('venue')!

// Mint holdings for alice

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    partyInfo.get('alice')!.partyId,
    '2000000'
)

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
)
    .sign(sender.keyPair.privateKey)
    .execute({ partyId: sender.partyId })

// Mint holdings for bob

const [amuletTapCommandBob, amuletTapDisclosedContractsBob] =
    await sdk.amulet.tap(recipient.partyId, '2000000')

await (
    await sdk.ledger.prepare({
        partyId: recipient.partyId,
        commands: amuletTapCommandBob,
        disclosedContracts: amuletTapDisclosedContractsBob,
    })
)
    .sign(recipient.keyPair.privateKey)
    .execute({ partyId: recipient.partyId })

//Alice creates OTCTradeProposal

const amuletAsset = await sdk.asset.find(
    'Amulet',
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const transferLegs = {
    leg0: {
        sender: sender.partyId,
        receiver: recipient.partyId,
        amount: '100',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
    leg1: {
        sender: recipient.partyId,
        receiver: sender.partyId,
        amount: '20',
        instrumentId: { admin: amuletAsset.admin, id: 'Amulet' },
        meta: { values: {} },
    },
}

const createProposal = {
    CreateCommand: {
        templateId:
            '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
        createArguments: {
            venue: venue.partyId,
            tradeCid: null,
            transferLegs,
            approvers: [sender.partyId],
        },
    },
}

await (
    await sdk.ledger.prepare({
        partyId: sender.partyId,
        commands: createProposal,
        disclosedContracts: [],
    })
)
    .sign(sender.keyPair.privateKey)
    .execute({ partyId: sender.partyId })

logger.info(
    'OTC Trade Proposal created by Alice, ready for Bob to accept OTCTradeProposal'
)

// Bob accepts OTCTradeProposal

// await sdk.ledger.readAcs({
//     templateIds: [
//         '#splice-token-test-trading-app:Splice.Testing.Apps.TradingApp:OTCTradeProposal',
//     ],
//     parties: [recipient.partyId],
// })
