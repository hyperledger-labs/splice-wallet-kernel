import { Holding, PrettyContract } from '@canton-network/core-tx-parser'
import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({
    name: '07-token-standard-reject-expire-withdraw',
    level: 'info',
})

const originalTap = 200000
const transferAmount = 100

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

type AllHoldings = {
    locked: PrettyContract<Holding>[]
    unlocked: PrettyContract<Holding>[]
}

const getHoldingUtxosCountGroupedByLock = async (): Promise<AllHoldings> => {
    const utxosUnlocked = await sdk.tokenStandard?.listHoldingUtxos(false)
    const utxosAll = await sdk.tokenStandard?.listHoldingUtxos(true)

    return {
        locked:
            utxosAll?.filter(
                (utxo) =>
                    !utxosUnlocked?.some(
                        (unlocked) => unlocked.contractId === utxo.contractId
                    )
            ) || [],
        unlocked: utxosUnlocked || [],
    }
}

const assertLockedAmount = (
    utxoLockedCounts: AllHoldings,
    expectedLockedAmount: number,
    expectedUnlockedAmount: number
): void => {
    const lockedSum = utxoLockedCounts.locked.reduce(
        (sum, holding) => sum + Number(holding.interfaceViewValue.amount),
        0
    )
    const unlockedSum = utxoLockedCounts.unlocked.reduce(
        (sum, holding) => sum + Number(holding.interfaceViewValue.amount),
        0
    )

    if (
        lockedSum === expectedLockedAmount &&
        unlockedSum === expectedUnlockedAmount
    ) {
        return
    }

    logger.error(
        {
            utxoLockedCounts,
            lockedSum: lockedSum.toString(),
            unlockedSum: unlockedSum.toString(),
            expectedLockedAmount,
            expectedUnlockedAmount,
        },
        'Unexpected sum of locked/unlocked Holding amounts'
    )
    throw new Error('Unexpected sum of locked/unlocked Holding amounts')
}

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectAdmin()
logger.info('Connected to admin ledger')

await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
logger.info('Connected to topology service')

const sender = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairSender.privateKey,
    'alice'
)
logger.info(`Created party: ${sender!.partyId}`)
await sdk.setPartyId(sender!.partyId)

const receiver = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

// mint holdings for Alice
const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    originalTap.toString(),
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

// Alice creates transfer to Bob
logger.info('Creating transfer transaction (reject)')
const [transferCommandToReject, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        transferAmount.toString(),
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommandToReject,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts2
)
logger.info('Submitted transfer transaction (reject)')

const senderUtxosBeforeRejected = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosBeforeRejected })
assertLockedAmount(
    senderUtxosBeforeRejected,
    transferAmount,
    originalTap - transferAmount
)

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

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    rejectTransferCommand,
    keyPairReceiver.privateKey,
    v4(),
    disclosedContracts3
)

logger.info('Rejected transfer instruction')

// Alice creates transfer to Bob with expiry date
await sdk.setPartyId(sender!.partyId)
const senderUtxosAfterRejected = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosAfterRejected })
assertLockedAmount(senderUtxosAfterRejected, 0, originalTap)

const EXPIRATION_MS = 10_000
const expiryDate = new Date(Date.now() + EXPIRATION_MS)

logger.info('Creating transfer transaction (expire)')
const [transferCommandToExpire, disclosedContracts4] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        transferAmount.toString(),
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref',
        expiryDate
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommandToExpire,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts4
)
logger.info('Submitted transfer transaction (expire)')

const senderUtxosBeforeExpired = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosBeforeExpired })
assertLockedAmount(
    senderUtxosBeforeExpired,
    transferAmount,
    originalTap - transferAmount
)

const pendingInstructions2 =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const expiredTransferCid = pendingInstructions2?.[0].contractId!

// Wait for transfer instruction to expire
await new Promise((res) => setTimeout(res, EXPIRATION_MS + 5_000))

const senderUtxosAfterExpired = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosAfterExpired })
assertLockedAmount(senderUtxosAfterExpired, 0, originalTap)

// Alice creates transfer that will be withdrawn
logger.info('Creating transfer transaction (withdraw)')
const [transferCommandToWithdraw, disclosedContracts5] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        transferAmount.toString(),
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommandToWithdraw,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts5
)
logger.info('Submitted transfer transaction (withdraw)')

const senderUtxosBeforeWithdraw = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosBeforeWithdraw })
assertLockedAmount(
    senderUtxosBeforeWithdraw,
    transferAmount,
    originalTap - transferAmount
)

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

const withdrawCommandId = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    withdrawTransferCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts6
)

logger.info('Withdrawn transfer instruction')

const senderUtxosAfterWithdraw = await getHoldingUtxosCountGroupedByLock()
logger.info({ senderUtxosAfterWithdraw })
assertLockedAmount(senderUtxosAfterWithdraw, 0, originalTap)

// Alice creates transfer to Bob to accept using reclaimed holdings
const [transferCommandToAccept, disclosedContracts7] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        transferAmount.toString(),
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        undefined,
        'memo-ref'
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommandToAccept,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts7
)
logger.info('Submitted transfer transaction')

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

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    acceptTransferCommand,
    keyPairReceiver.privateKey,
    v4(),
    disclosedContracts8
)
logger.info('Accepted transfer instruction')
