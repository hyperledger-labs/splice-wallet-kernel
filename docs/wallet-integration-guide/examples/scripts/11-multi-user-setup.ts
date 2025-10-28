import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
    AuthController,
    UnsafeAuthController,
} from '@canton-network/wallet-sdk'
import { Logger, pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '04-token-standard-localnet', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const operatorSDK = new WalletSDKImpl().configure({
    logger,
})

logger.info('Operator sets up users and primary parties')

await operatorSDK.connect()
await operatorSDK.connectAdmin()
await operatorSDK.connectTopology(
    localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
)

const aliceInternal =
    await operatorSDK.adminLedger!.allocateInternalParty('alice')
const bobInternal = await operatorSDK.adminLedger!.allocateInternalParty('bob')
const masterUserInternal =
    await operatorSDK.adminLedger!.allocateInternalParty('master-user')

const aliceUser = await operatorSDK.adminLedger!.createUser(
    'alice-user',
    aliceInternal
)
const bobUser = await operatorSDK.adminLedger!.createUser(
    'bob-user',
    bobInternal
)

const masterUser = await operatorSDK.adminLedger!.createUser(
    'master-user',
    masterUserInternal
)

await operatorSDK.adminLedger!.grantMasterUserRights(masterUser.id, true, true)

logger.info(
    `Created alice user: ${aliceUser.id} with primary party (internal) ${aliceUser.primaryParty}`
)
logger.info(
    `Created bob user: ${bobUser.id} with primary party (internal) ${bobUser.primaryParty}`
)
logger.info(
    `Created master user: ${masterUser.id} with primary party (internal) ${masterUser.primaryParty}, with read as and execute as rights`
)

//create a SDK for each user with their own auth factory
const aliceSDK = new WalletSDKImpl().configure({
    logger,
    authFactory: (logger?: Logger): AuthController => {
        const controller = new UnsafeAuthController(logger)

        controller.userId = aliceUser.id
        controller.adminId = aliceUser.id
        controller.audience = 'https://canton.network.global'
        controller.unsafeSecret = 'unsafe'

        return controller
    },
})

await aliceSDK.connect()
await aliceSDK.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
aliceSDK.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const bobSDK = new WalletSDKImpl().configure({
    logger,
    authFactory: (logger?: Logger): AuthController => {
        const controller = new UnsafeAuthController(logger)

        controller.userId = bobUser.id
        controller.adminId = bobUser.id
        controller.audience = 'https://canton.network.global'
        controller.unsafeSecret = 'unsafe'

        return controller
    },
})

await bobSDK.connect()
await bobSDK.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
bobSDK.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const masterUserSDK = new WalletSDKImpl().configure({
    logger,
    authFactory: (logger?: Logger): AuthController => {
        const controller = new UnsafeAuthController(logger)

        controller.userId = masterUser.id
        controller.adminId = masterUser.id
        controller.audience = 'https://canton.network.global'
        controller.unsafeSecret = 'unsafe'

        return controller
    },
})

await masterUserSDK.connect()
await masterUserSDK.connectTopology(
    localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
)
masterUserSDK.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
logger.info('connected ledger only SDK for each user')

const aliceKeyPair = createKeyPair()
const bobKeyPair = createKeyPair()

const alice = await aliceSDK.userLedger?.signAndAllocateExternalParty(
    aliceKeyPair.privateKey,
    'alice'
)
logger.info(`Created party: ${alice!.partyId}`)
await aliceSDK.setPartyId(alice!.partyId)

const bob = await bobSDK.userLedger?.signAndAllocateExternalParty(
    bobKeyPair.privateKey,
    'bob'
)
logger.info(`Created party: ${bob!.partyId}`)
await bobSDK.setPartyId(bob!.partyId)

logger.info('alice and bob each create an external party')

const masterWalletView = await masterUserSDK.userLedger?.listWallets()

if (!masterWalletView?.find((p) => p === alice!.partyId)) {
    throw new Error('master user cannot see alice party')
}
if (!masterWalletView?.find((p) => p === bob!.partyId)) {
    throw new Error('master user cannot see bob party')
}

logger.info('master user can see both parties')

const aliceWalletView = await aliceSDK.userLedger?.listWallets()

if (aliceWalletView?.find((p) => p === bob!.partyId)) {
    throw new Error('alice user can see bob party')
}

if (!aliceWalletView?.find((p) => p === alice!.partyId)) {
    throw new Error('alice user cannot see alice party')
}

const bobWalletView = await bobSDK.userLedger?.listWallets()

if (bobWalletView?.find((p) => p === alice!.partyId)) {
    throw new Error('bob user can see alice party')
}

logger.info(
    'alice and bob have proper isolation and cannot see each others external parties'
)

//user management test

await bobSDK.userLedger?.grantRights([alice!.partyId])

const bobWalletViewAfterGrantRights = await bobSDK.userLedger?.listWallets()

if (!bobWalletViewAfterGrantRights?.find((p) => p === alice!.partyId)) {
    throw new Error('bob user cannot see alice party even with ReadAs rights')
}
