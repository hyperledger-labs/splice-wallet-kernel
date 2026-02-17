import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
    sign,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: 'v1-initialization', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)
const userId = localNetAuth.userId!

const sdk = await Sdk.create({
    logger,
    authTokenProvider: new AuthTokenProvider(localNetAuth),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'aliceInWonderland',
    })
    .sign(aliceKeys.privateKey)
    .execute(userId, { grantUserRights: true })

logger.info({ alice }, 'Alice party representation:')

const pingCommand = [
    {
        CreateCommand: {
            templateId:
                '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
            createArguments: {
                id: v4(),
                initiator: alice.partyId,
                responder: alice.partyId,
            },
        },
    },
]

logger.info({ pingCommand }, 'Ping command to be submitted:')

try {
    const preparedPingCommand = await sdk.ledger.prepare({
        userId,
        partyId: alice.partyId,
        commands: pingCommand,
        disclosedContracts: [],
    })

    logger.info({ preparedPingCommand }, 'Prepared ping command:')

    const signedHash = sign(
        preparedPingCommand.preparedTransactionHash,
        aliceKeys.privateKey
    )

    logger.info('Ping command signed successfully')

    logger.info(
        { signedHash },
        'Signed hash of the prepared ping command transaction'
    )

    logger.info(
        { alice: { publicKeyFingerprint: alice.publicKeyFingerprint } },
        'Alice public key fingerprint'
    )

    await sdk.ledger.execute({
        prepared: preparedPingCommand,
        signature: signedHash,
        userId,
        partyId: alice.partyId,
    })
} catch (e) {
    logger.error({ error: e }, 'Error preparing ping command')
}
