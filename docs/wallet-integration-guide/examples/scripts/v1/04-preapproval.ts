import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
    PreapprovalCommandArgs,
    PreapprovalCommandArgsWithDso,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

const logger = pino({ name: 'v1-preapproval', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)

const sdk = await Sdk.create({
    authTokenProvider: new AuthTokenProvider(localNetAuth),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    logAdapter: 'pino',
})

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'aliceInWonderland',
    })
    .sign(aliceKeys.privateKey)
    .execute()

const bobKeys = sdk.keys.generate()

const bob = await sdk.party.external
    .create(bobKeys.publicKey, {
        partyHint: 'bobTheBuilder',
    })
    .sign(bobKeys.privateKey)
    .execute()

const preapprovalArgs: PreapprovalCommandArgs = {
    parties: {
        receiver: bob.partyId,
        provider: alice.partyId,
    },
    privateKey: bobKeys.privateKey,
}
const preapprovalArgsWithDso: PreapprovalCommandArgsWithDso =
    structuredClone(preapprovalArgs)
preapprovalArgsWithDso.parties.dso = (await localNetAuth.getAdminToken()).userId

const createdPreapproval = await sdk.amulet.preapproval.create(
    preapprovalArgsWithDso
)

logger.info({ createdPreapproval })

const fetchedPreapproval = await sdk.amulet.preapproval.fetch(bob.partyId)

logger.info({ fetchedPreapproval }) // TODO: fix that
