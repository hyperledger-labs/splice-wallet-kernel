import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
    signTransactionHash,
    TopologyController,
} from '@canton-network/wallet-sdk'
import { on } from 'events'
import { pino } from 'pino'
import { v4 } from 'uuid'

const onlineLogger = pino({ name: '08-online-localnet', level: 'info' })
const offlineLogger = pino({ name: '08-offline-localnet', level: 'info' })
// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const onlineSDK = new WalletSDKImpl().configure({
    logger: onlineLogger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

onlineLogger.info(
    '===================== CONNECTING ONLINE SDK ====================='
)

await onlineSDK.connect()
onlineLogger.info('Connected to ledger')
await onlineSDK.connectAdmin()
onlineLogger.info('Connected as admin')
await onlineSDK.connectTopology(
    localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
)
onlineLogger.info(
    `Connected to topology: ${localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL}`
)
onlineSDK.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
onlineLogger.info(
    `defined registry url: ${localNetStaticConfig.LOCALNET_REGISTRY_API_URL}`
)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
offlineLogger.info(
    '===================== OFFLINE KEY GENERATION ====================='
)

const keyPairSender = createKeyPair()
offlineLogger.info(
    `Created sender key pair with public key: ${keyPairSender.publicKey}`
)
const keyPairReceiver = createKeyPair()
offlineLogger.info(
    `Created receiver key pair with public key: ${keyPairReceiver.publicKey}`
)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '===================== PREPARING ONBOARDING ====================='
)

const senderPrepared = await onlineSDK.topology?.prepareExternalPartyTopology(
    keyPairSender.publicKey,
    'alice'
)
onlineLogger.info(
    `Prepared sender onboarding with combined hash: ${senderPrepared!.combinedHash}`
)
const receiverPrepared = await onlineSDK.topology?.prepareExternalPartyTopology(
    keyPairReceiver.publicKey,
    'bob'
)
onlineLogger.info(
    `Prepared receiver onboarding with combined hash: ${receiverPrepared!.combinedHash}`
)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
offlineLogger.info(
    '===================== OFFLINE ONBOARDING SIGNING ====================='
)

const recomputedSenderHash = await TopologyController.computeTopologyTxHash(
    senderPrepared!.partyTransactions
)

if (recomputedSenderHash !== senderPrepared!.combinedHash) {
    throw new Error(
        'Recomputed sender hash does not match prepared combined hash'
    )
}

const senderSigned = signTransactionHash(
    senderPrepared!.combinedHash,
    keyPairSender.privateKey
)
offlineLogger.info(`Signed sender onboarding hash: ${senderSigned}`)

const recomputedReceiverHash = await TopologyController.computeTopologyTxHash(
    receiverPrepared!.partyTransactions
)

if (recomputedReceiverHash !== receiverPrepared!.combinedHash) {
    throw new Error(
        'Recomputed receiver hash does not match prepared combined hash'
    )
}

const receiverSigned = signTransactionHash(
    receiverPrepared!.combinedHash,
    keyPairReceiver.privateKey
)
offlineLogger.info(`Signed receiver onboarding hash: ${receiverSigned}`)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '===================== SUBMITTING ONBOARDING ====================='
)

const senderParty = await onlineSDK.topology?.submitExternalPartyTopology(
    senderSigned,
    senderPrepared!
)

onlineLogger.info(`created sender: ${senderParty!.partyId}`)

const receiverParty = await onlineSDK.topology?.submitExternalPartyTopology(
    receiverSigned,
    receiverPrepared!
)

onlineLogger.info(`created receiver: ${receiverParty!.partyId}`)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '===================== SENDER TAP (PREPARE) ====================='
)
await onlineSDK.setPartyId(senderParty!.partyId)

const instrumentAdminPartyId =
    (await onlineSDK.tokenStandard?.getInstrumentAdmin()) || ''

const [tapCommand, disclosedContracts] =
    await onlineSDK.tokenStandard!.createTap(senderParty!.partyId, '2000000', {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    })

const preparedTap = await onlineSDK.userLedger?.prepareSubmission(
    tapCommand,
    v4(),
    disclosedContracts
)

onlineLogger.info(
    `Prepared tap with hash: ${preparedTap!.preparedTransactionHash}`
)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
offlineLogger.info(
    '===================== OFFLINE TAP SIGNING ====================='
)

const recomputedTapHash = await TopologyController.createTransactionHash(
    preparedTap!.preparedTransaction!
)

if (recomputedTapHash !== preparedTap!.preparedTransactionHash) {
    throw new Error('Recomputed tap hash does not match prepared tap hash')
}

const signedTapHash = signTransactionHash(
    preparedTap!.preparedTransactionHash!,
    keyPairSender.privateKey
)
offlineLogger.info(`Signed tap hash: ${signedTapHash}`)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info('===================== SUBMITTING TAP =====================')

await onlineSDK.userLedger?.executeSubmissionAndWaitFor(
    preparedTap!,
    signedTapHash,
    keyPairSender.publicKey,
    v4()
)

onlineLogger.info('Tap completed')

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '===================== SENDER TRANSFER (PREPARE) ====================='
)

const [transferCommand, disclosedContracts2] =
    await onlineSDK.tokenStandard!.createTransfer(
        senderParty!.partyId,
        receiverParty!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        [],
        'memo-ref'
    )

const preparedTransfer = await onlineSDK.userLedger?.prepareSubmission(
    transferCommand,
    v4(),
    disclosedContracts2
)

onlineLogger.info(
    `Prepared transfer with hash: ${preparedTransfer!.preparedTransactionHash}`
)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
offlineLogger.info(
    '===================== OFFLINE TRANSFER SIGNING ====================='
)

const recomputedTransactionHash =
    await TopologyController.createTransactionHash(
        preparedTransfer!.preparedTransaction!
    )

if (recomputedTransactionHash !== preparedTransfer!.preparedTransactionHash) {
    throw new Error(
        'Recomputed transfer hash does not match prepared transfer hash'
    )
}

const signedTransferHash = signTransactionHash(
    preparedTransfer!.preparedTransactionHash!,
    keyPairSender.privateKey
)

offlineLogger.info(`Signed transfer hash: ${signedTransferHash}`)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '====================== SUBMITTING TRANSFER ====================='
)

await onlineSDK.userLedger?.executeSubmissionAndWaitFor(
    preparedTransfer!,
    signedTransferHash,
    keyPairSender.publicKey,
    v4()
)

onlineLogger.info('Transfer submitted')

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '===================== ACCEPT TRANSFER (PREPARE) ====================='
)
await onlineSDK.setPartyId(receiverParty!.partyId)

const pendingOffers =
    await onlineSDK.tokenStandard?.fetchPendingTransferInstructionView()

if (pendingOffers?.length !== 1) {
    throw new Error(
        `Expected exactly one pending transfer instruction, but found ${pendingOffers?.length}`
    )
}

onlineLogger.info(`Found pending offer: ${pendingOffers[0].contractId}`)

const pendingOffer = pendingOffers[0]
const [acceptTransferCommand, disclosedContracts3] =
    await onlineSDK.tokenStandard!.exerciseTransferInstructionChoice(
        pendingOffer.contractId,
        'Accept'
    )

const preparedAccept = await onlineSDK.userLedger?.prepareSubmission(
    acceptTransferCommand,
    v4(),
    disclosedContracts3
)

onlineLogger.info(
    `Prepared accept with hash: ${preparedAccept!.preparedTransactionHash}`
)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
offlineLogger.info(
    '===================== OFFLINE ACCEPT SIGNING ====================='
)

const recomputedAcceptHash = await TopologyController.createTransactionHash(
    preparedAccept!.preparedTransaction!
)

if (recomputedAcceptHash !== preparedAccept!.preparedTransactionHash) {
    throw new Error(
        'Recomputed accept hash does not match prepared accept hash'
    )
}

const signedAcceptHash = signTransactionHash(
    preparedAccept!.preparedTransactionHash!,
    keyPairReceiver.privateKey
)

offlineLogger.info(`Signed accept hash: ${signedAcceptHash}`)

//this can go to fast, so sleep to make logging clearer
await new Promise((resolve) => setTimeout(resolve, 100))
onlineLogger.info(
    '===================== SUBMITTING ACCEPT ====================='
)

await onlineSDK.userLedger?.executeSubmissionAndWaitFor(
    preparedAccept!,
    signedAcceptHash,
    keyPairReceiver.publicKey,
    v4()
)

onlineLogger.info('Accepted transfer instruction')
