import { PartyId } from '@canton-network/core-types'

import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { beforeAll } from '@jest/globals'

declare global {
    var EXISTING_PARTY_1: {
        partyId: PartyId
        publicKeyFingerprint: string
        topologyTransactions?: string[]
        multiHash: string
    }
    var EXISTING_PARTY_1_KEYS: { publicKey: string; privateKey: string }

    var EXISTING_PARTY_2: {
        partyId: PartyId
        publicKeyFingerprint: string
        topologyTransactions?: string[]
        multiHash: string
    }
    var EXISTING_PARTY_2_KEYS: { publicKey: string; privateKey: string }

    var EXISTING_PARTY_WITH_PREAPPROVAL: {
        partyId: PartyId
        publicKeyFingerprint: string
        topologyTransactions?: string[]
        multiHash: string
    }
    var EXISTING_PARTY_WITH_PREAPPROVAL_KEYS: {
        publicKey: string
        privateKey: string
    }

    var INSTRUMENT_ADMIN_PARTY: PartyId

    var VALIDATOR_OPERATOR_PARTY: PartyId

    // var EXISTING_TOPOLOGY: {
    //     multiHash: string
    //     partyId: string
    //     publicKeyFingerprint: string
    //     topologyTransactions?: string[]
    // }

    var PREPARED_COMMAND: unknown
    var PREPARED_TRANSACTION: unknown
}

// @disable-snapshot-test
async function beforeEachSetup() {
    const logger = pino({ name: 'v1-setup-tests', level: 'info' })

    //Configure sdk

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
    logger.info('Configuring sdk')

    const sdk = await Sdk.create({
        authTokenProvider,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
        tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
        scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
        registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    })

    // ========= Setup Existing Party 1 =========

    logger.info('setting up existing party 1')
    global.EXISTING_PARTY_1_KEYS = sdk.keys.generate()
    global.EXISTING_PARTY_1 = await sdk.party.external
        .create(global.EXISTING_PARTY_1_KEYS.publicKey, {})
        .sign(global.EXISTING_PARTY_1_KEYS.privateKey)
        .execute()

    logger.info('setting up existing party 2')
    // ========= Setup Existing Party 2 =========

    global.EXISTING_PARTY_2_KEYS = sdk.keys.generate()
    global.EXISTING_PARTY_2 = await sdk.party.external
        .create(global.EXISTING_PARTY_2_KEYS.publicKey, {})
        .sign(global.EXISTING_PARTY_2_KEYS.privateKey)
        .execute()

    // ========= Setup Prepared Command =========

    logger.info('setting up prepared ping command')

    global.PREPARED_COMMAND = sdk.utils.ping.create([
        {
            initiator: global.EXISTING_PARTY_1.partyId,
            responder: global.EXISTING_PARTY_2.partyId,
        },
    ])

    // ========= Setup Prepared Transaction =========

    logger.info('setting up prepared tx')

    global.PREPARED_TRANSACTION = sdk.ledger.prepare({
        partyId: global.EXISTING_PARTY_1.partyId,
        commands: global.PREPARED_COMMAND,
    })

    // // ========= Setup non-submitted Topology for Existing Party 1 =========
    // global.EXISTING_TOPOLOGY = await sdk.userLedger!.generateExternalParty(
    //     global.EXISTING_PARTY_1_KEYS.publicKey,
    //     'my-party'
    // )
    // ========= Setup Instrument Admin Party =========

    logger.info('setting up instrument admin party')

    global.INSTRUMENT_ADMIN_PARTY = (
        await sdk.asset.find(
            'Amulet',
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        )
    ).admin

    // ========= Setup Existing Party with Preapproval =========

    logger.info('setting up preapproval party')

    global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS = sdk.keys.generate()
    global.EXISTING_PARTY_WITH_PREAPPROVAL = await sdk.party.external
        .create(global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS.publicKey, {})
        .sign(global.EXISTING_PARTY_WITH_PREAPPROVAL_KEYS.privateKey)
        .execute()

    // ========== SETUP PREAPPROVAL FOR EXISTING PARTY WITH PREAPPROVAL ==========
    {
        const createPreapprovalCommand =
            await sdk.amulet.preapproval.command.create({
                parties: {
                    receiver: global.EXISTING_PARTY_WITH_PREAPPROVAL.partyId,
                },
            })

        await sdk.ledger
            .prepare({
                partyId: EXISTING_PARTY_WITH_PREAPPROVAL.partyId,
                commands: createPreapprovalCommand,
            })
            .sign(EXISTING_PARTY_WITH_PREAPPROVAL_KEYS.privateKey)
            .execute({
                partyId: EXISTING_PARTY_WITH_PREAPPROVAL.partyId,
            })
    }

    // ========== SETUP TRANSFER PENDING FROM PARTY 1 TO PARTY 2 ==========
    {
        logger.info('Setting up transfer pending from party 1 to party 2')
        const [amuletTapCommand, amuletTapDisclosedContracts] =
            await sdk.amulet.tap(global.EXISTING_PARTY_1.partyId, '10000')

        await sdk.ledger
            .prepare({
                partyId: global.EXISTING_PARTY_1.partyId,
                commands: amuletTapCommand,
                disclosedContracts: amuletTapDisclosedContracts,
            })
            .sign(global.EXISTING_PARTY_1_KEYS.privateKey)
            .execute({ partyId: global.EXISTING_PARTY_1.partyId })

        const [transferCommand, transferDisclosedContracts] =
            await sdk.token.transfer.create({
                sender: global.EXISTING_PARTY_1.partyId,
                recipient: global.EXISTING_PARTY_2.partyId,
                instrumentId: 'Amulet',
                registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
                amount: '2000',
            })

        logger.info('Transfer command created, ready for signing and execution')

        await sdk.ledger
            .prepare({
                partyId: global.EXISTING_PARTY_1.partyId,
                commands: transferCommand,
                disclosedContracts: transferDisclosedContracts,
            })
            .sign(global.EXISTING_PARTY_1_KEYS.privateKey)
            .execute({ partyId: global.EXISTING_PARTY_1.partyId })
    }

    console.log('Setup complete')
}

beforeAll(async () => {
    await beforeEachSetup()
}, 60_000)

export async function sdkSetup() {
    const logger = pino({
        name: 'v1-snippets',
        level: 'info',
    })

    // default auth provider against localnet
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

    return await Sdk.create({
        authTokenProvider,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
        tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
        scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
        registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    })
}
