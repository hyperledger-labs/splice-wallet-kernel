import {
    localNetStaticConfig,
    SDK,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
} from './utils/index.js'

const onlineLogger = pino({ name: '14-online-localnet', level: 'info' })
const offlineLogger = pino({ name: '14-oggline-localnet', level: 'info' })

const onlineSDK = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

onlineLogger.info(`Online sdk initialized.`)

const offlineSdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

offlineLogger.info(`Offline sdk initialized.`)

const keyPairSender = offlineSdk.keys.generate()

offlineLogger.info('Created sender keyPair')

const senderPartyPrepared = onlineSDK.party.external.create(
    keyPairSender.publicKey,
    {
        partyHint: 'v1-14-alice',
    }
)

const senderPartyTopology = await senderPartyPrepared.topology()

onlineLogger.info(
    `Prepared sender onboarding with multi hash: ${senderPartyTopology.multiHash}`
)

const senderSignedTopologyTx = signTransactionHash(
    senderPartyTopology.multiHash,
    keyPairSender.privateKey
)

offlineLogger.info(`Sender signed onboarding hash`)

const senderParty = await senderPartyPrepared.execute(senderSignedTopologyTx)

onlineLogger.info(`Created sender party: ${senderParty}`)

const keyPairReceiver = offlineSdk.keys.generate()

offlineLogger.info('Created sender keyPair')

const receiverPartyPrepared = onlineSDK.party.external.create(
    keyPairReceiver.publicKey,
    {
        partyHint: 'v1-14-bob',
    }
)

const receiverPartyTopology = await receiverPartyPrepared.topology()

onlineLogger.info(
    `Prepared sender onboarding with multi hash: ${receiverPartyTopology.multiHash}`
)

const receiverSignedTopologyTx = signTransactionHash(
    receiverPartyTopology.multiHash,
    keyPairReceiver.privateKey
)

offlineLogger.info(`Receiver signed onboarding hash`)

const receiverParty = await receiverPartyPrepared.execute(
    receiverSignedTopologyTx
)

onlineLogger.info(`Created receiver party: ${receiverParty}`)

// Configure amulet namespace for online sdk

const amulet = await onlineSDK.amulet(AMULET_NAMESPACE_CONFIG)

onlineLogger.info(
    '===================== SENDER TAP (PREPARE) ====================='
)

const [amuletTapCommand, amuletTapDisclosedContracts] = await amulet.tap(
    senderParty.partyId,
    '10000'
)

const preparedTapCommand = onlineSDK.ledger.prepare({
    partyId: senderParty.partyId,
    commands: amuletTapCommand,
    disclosedContracts: amuletTapDisclosedContracts,
})

const { response: preparedTapCommandResponse } =
    await preparedTapCommand.toJSON()

onlineLogger.info(
    `Prepared tap with hash: ${preparedTapCommandResponse.preparedTransactionHash}`
)

offlineLogger.info(
    '===================== OFFLINE TAP SIGNING ====================='
)
const calculatedTxHash = await offlineSdk.ledger.preparedTransaction.hash(
    preparedTapCommandResponse.preparedTransaction
)

if (
    calculatedTxHash.toBase64() !==
    preparedTapCommandResponse.preparedTransactionHash
)
    throw Error('Recomputed tap hash does not match prepared tap hash')

const signatureTapCommand = signTransactionHash(
    preparedTapCommandResponse.preparedTransactionHash,
    keyPairSender.privateKey
)
offlineLogger.info('Signed tap transaction hash')

const signed = onlineSDK.ledger.fromSignature(
    preparedTapCommandResponse,
    signatureTapCommand
)

await onlineSDK.ledger.execute(signed, { partyId: senderParty.partyId })

onlineLogger.info('Tap completed')

//creating a transfer
onlineLogger.info(
    '===================== SENDER TRANSFER (PREPARE) ====================='
)

const token = await onlineSDK.token(TOKEN_NAMESPACE_CONFIG)

const [transferCommand, transferDisclosedContracts] =
    await token.transfer.create({
        sender: senderParty.partyId,
        recipient: receiverParty.partyId,
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
        amount: '100',
    })

const preparedTransferCommand = onlineSDK.ledger.prepare({
    partyId: senderParty.partyId,
    commands: transferCommand,
    disclosedContracts: transferDisclosedContracts,
})

offlineLogger.info(
    '===================== OFFLINE TRANSFER SIGNING ====================='
)

const { response: preparedTransferResponse } =
    await preparedTransferCommand.toJSON()

onlineLogger.info(
    `Prepared create transfer with hash: ${preparedTransferResponse.preparedTransactionHash}`
)

const calculatedCreateTransferHash =
    await offlineSdk.ledger.preparedTransaction.hash(
        preparedTransferResponse.preparedTransaction
    )

if (
    calculatedCreateTransferHash.toBase64() !==
    preparedTransferResponse.preparedTransactionHash
)
    throw Error(
        'Recomputed create transfer hash does not match prepared create transfer hash'
    )

const signatureTransferCommand = signTransactionHash(
    preparedTransferResponse.preparedTransactionHash,
    keyPairSender.privateKey
)
offlineLogger.info('Signed create transfer transaction hash')

const signedTransferHash = onlineSDK.ledger.fromSignature(
    preparedTransferResponse,
    signatureTransferCommand
)

onlineLogger.info(
    '====================== SUBMITTING TRANSFER ====================='
)

await onlineSDK.ledger.execute(signedTransferHash, {
    partyId: senderParty.partyId,
})

onlineLogger.info(
    `Created a transfer from ${senderParty.partyId} to ${receiverParty.partyId}`
)

onlineLogger.info(
    '===================== ACCEPT TRANSFER (PREPARE) ====================='
)

const pendingOffers = await token.transfer.pending(receiverParty.partyId)

if (pendingOffers?.length !== 1) {
    throw new Error(
        `Expected exactly one pending transfer instruction, but found ${pendingOffers?.length}`
    )
}

onlineLogger.info(`Found pending offer: ${pendingOffers[0].contractId}`)

const pendingOffer = pendingOffers[0]

const [acceptTransferCommand, transferDisclosedContractsAccept] =
    await token.transfer.accept({
        transferInstructionCid: pendingOffer.contractId,
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

const preparedTransferAcceptCommand = onlineSDK.ledger.prepare({
    partyId: receiverParty.partyId,
    commands: acceptTransferCommand,
    disclosedContracts: transferDisclosedContractsAccept,
})

const { response: preparedTransferAcceptResponse } =
    await preparedTransferAcceptCommand.toJSON()

onlineLogger.info(
    `Prepared create transfer with hash: ${preparedTransferAcceptResponse.preparedTransactionHash}`
)

const calculatedAcceptTransferHash =
    await offlineSdk.ledger.preparedTransaction.hash(
        preparedTransferAcceptResponse.preparedTransaction
    )

if (
    calculatedAcceptTransferHash.toBase64() !==
    preparedTransferAcceptResponse.preparedTransactionHash
)
    throw Error(
        'Recomputed accept transfer hash does not match prepared accept transfer hash'
    )

const signatureAcceptTransfer = signTransactionHash(
    preparedTransferAcceptResponse.preparedTransactionHash,
    keyPairReceiver.privateKey
)
offlineLogger.info('Signed accept transfer transaction hash')

const signedAcceptTransferHash = onlineSDK.ledger.fromSignature(
    preparedTransferAcceptResponse,
    signatureAcceptTransfer
)

onlineLogger.info(
    '===================== SUBMITTING ACCEPT ====================='
)

await onlineSDK.ledger.execute(signedAcceptTransferHash, {
    partyId: receiverParty.partyId,
})

onlineLogger.info('Accepted transfer instruction')
