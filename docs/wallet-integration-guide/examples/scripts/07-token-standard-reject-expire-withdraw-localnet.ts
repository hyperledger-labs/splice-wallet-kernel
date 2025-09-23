import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { LOCALNET_REGISTRY_API_URL, LOCALNET_VALIDATOR_URL } from '../config.js'

const logger = pino({
    name: '07-token-standard-reject-expire-withdraw',
    level: 'info',
})

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

type UtxoLockedCounts = {
    locked: 0
    unlocked: 0
}

const getHoldingUtxosCountGroupedByLock =
    async (): Promise<UtxoLockedCounts> => {
        const utxosUnlocked = await sdk.tokenStandard?.listHoldingUtxos(false)
        const utxosAll = await sdk.tokenStandard?.listHoldingUtxos(true)
        const utxosUnlockedCids = utxosUnlocked!.map((utxo) => utxo.contractId)

        return utxosAll!.reduce(
            (accumulator, utxo) => {
                const isUnlocked = utxosUnlockedCids.includes(utxo.contractId)
                if (isUnlocked) {
                    accumulator.unlocked++
                } else {
                    accumulator.locked++
                }
                return accumulator
            },
            {
                locked: 0,
                unlocked: 0,
            }
        )
    }

const assertLockedAmount = (
    utxoLockedCounts: UtxoLockedCounts,
    expectedLocked: number,
    expectedUnlocked: number | null
): void => {
    if (
        utxoLockedCounts.locked === expectedLocked &&
        (expectedUnlocked === null ||
            utxoLockedCounts.unlocked === expectedUnlocked)
    ) {
        return
    }

    logger.error(
        {
            utxoLockedCounts,
            expectedLocked,
            expectedUnlocked,
        },
        'Unexpected count of locked/unlocked Holding UTXOs'
    )
    throw new Error('Unexpected count of locked/unlocked Holding UTXOs')
}

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(LOCALNET_VALIDATOR_URL)

const sender = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairSender.privateKey,
    'alice'
)
logger.info(`Created party: ${sender!.partyId}`)
await sdk.setPartyId(sender!.partyId)

const receiver = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets:')
    })
    .catch((error) => {
        logger.error({ error }, 'Error listing wallets')
    })

sdk.tokenStandard?.setTransferFactoryRegistryUrl(LOCALNET_REGISTRY_API_URL)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

// mint holdings for Alice
const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

const commandIdTap = await sdk.userLedger?.prepareSignAndExecuteTransaction(
    tapCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    commandIdTap!
)

// Alice creates transfer to Bob
logger.info('Creating transfer transaction (reject)')
const [transferCommandToReject, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

const transferCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        transferCommandToReject,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts2
    )
logger.info('Submitted transfer transaction (reject)')

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    transferCommandId!
)

const senderUtxosBeforeRejected = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosBeforeRejected })
assertLockedAmount(senderUtxosBeforeRejected, 1, null)

// Bob rejects the transfer
await sdk.setPartyId(receiver!.partyId)
const pendingInstructions =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid = pendingInstructions?.[0].contractId!

const [rejectTransferCommand, disclosedContracts3] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid,
        'Reject'
    )

const rejectCommandId = await sdk.userLedger?.prepareSignAndExecuteTransaction(
    rejectTransferCommand,
    keyPairReceiver.privateKey,
    v4(),
    disclosedContracts3
)

logger.info('Rejected transfer instruction')

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    rejectCommandId!
)

// Alice creates transfer to Bob with expiry date
await sdk.setPartyId(sender!.partyId)
const senderUtxosAfterRejected = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosAfterRejected })
assertLockedAmount(
    senderUtxosAfterRejected,
    0,
    senderUtxosBeforeRejected.unlocked + 1
)

const EXPIRATION_MS = 10_000
const expiryDate = new Date(Date.now() + EXPIRATION_MS)

logger.info('Creating transfer transaction (expire)')
const [transferCommandToExpire, disclosedContracts4] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref',
        expiryDate
    )

const transferCommandId2 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        transferCommandToExpire,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts4
    )
logger.info('Submitted transfer transaction (expire)')

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    transferCommandId2!
)

const senderUtxosBeforeExpired = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosBeforeExpired })
assertLockedAmount(senderUtxosBeforeExpired, 1, null)

const pendingInstructions2 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const expiredTransferCid = pendingInstructions2?.[0].contractId!

// Wait for transfer instruction to expire
await new Promise((res) => setTimeout(res, EXPIRATION_MS + 5_000))

const senderUtxosAfterExpired = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosAfterExpired })
assertLockedAmount(
    senderUtxosAfterExpired,
    0,
    senderUtxosBeforeExpired.unlocked + 1
)

// Alice creates transfer that will be withdrawn
logger.info('Creating transfer transaction (withdraw)')
const [transferCommandToWithdraw, disclosedContracts5] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

const transferCommandId3 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        transferCommandToWithdraw,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts5
    )
logger.info('Submitted transfer transaction (withdraw)')

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    transferCommandId3!
)

const senderUtxosBeforeWithdraw = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosBeforeWithdraw })
assertLockedAmount(senderUtxosBeforeWithdraw, 1, null)

const pendingInstructions3 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

// Note that previous transfer instruction that expired is still pending until rejected or withdrawn,
// but input holdings used in expired transfer are unlocked and can be used
const transferCid3 = pendingInstructions3?.find(
    (transferInstruction) =>
        transferInstruction.contractId !== expiredTransferCid
)!.contractId

// Alice withdraws the transfer
const [withdrawTransferCommand, disclosedContracts6] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid3!,
        'Withdraw'
    )

const withdrawCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        withdrawTransferCommand,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts6
    )

logger.info('Withdrawn transfer instruction')
await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    withdrawCommandId!
)

const senderUtxosAfterWithdraw = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosAfterWithdraw })
assertLockedAmount(
    senderUtxosAfterWithdraw,
    0,
    senderUtxosBeforeWithdraw.unlocked + 1
)

// Alice creates transfer to Bob to accept using reclaimed holdings
const [transferCommandToAccept, disclosedContracts7] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

const transferCommandId4 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        transferCommandToAccept,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts7
    )
logger.info('Submitted transfer transaction')

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    transferCommandId4!
)

// Bob accepts the transfer
await sdk.setPartyId(receiver!.partyId)

const pendingInstructions4 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid4 = pendingInstructions4?.find(
    (transferInstruction) =>
        transferInstruction.contractId !== expiredTransferCid
)!.contractId

const [acceptTransferCommand, disclosedContracts8] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        transferCid4!,
        'Accept'
    )

const transferCommandId5 =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        acceptTransferCommand,
        keyPairReceiver.privateKey,
        v4(),
        disclosedContracts8
    )
logger.info('Accepted transfer instruction')

await sdk.userLedger?.waitForCompletion(
    (await sdk.userLedger?.ledgerEnd())?.offset ?? 0,
    5000,
    transferCommandId5!
)
