import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '16-buy-traffic', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localValidatorDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

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

await sdk.setPartyId(receiver?.partyId!)
const validatorOperatorParty = await sdk.validator?.getValidatorUser()

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

logger.info(`instrument admin party id ${instrumentAdminPartyId}`)

logger.info('creating transfer preapproval proposal')

await sdk.setPartyId(validatorOperatorParty!)
await sdk.tokenStandard?.createAndSubmitTapInternal(
    validatorOperatorParty!,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.setPartyId(receiver?.partyId!)

const transferPreApprovalProposal =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        validatorOperatorParty!,
        receiver?.partyId!,
        instrumentAdminPartyId
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    [transferPreApprovalProposal],
    [
        {
            partyId: receiver!.partyId,
            privateKey: keyPairReceiver.privateKey,
        },
    ],
    v4()
)

logger.info('transfer pre approval proposal is created')

const participantId = await sdk.userLedger?.getParticipantId()

logger.info(participantId, 'participant id is')

await sdk.setPartyId(sender!.partyId!)

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

logger.info(tapCommand)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    [
        {
            partyId: sender!.partyId,
            privateKey: keyPairSender.privateKey,
        },
    ],
    v4(),
    disclosedContracts
)

logger.info(`executed tap command for external party ${sender?.partyId}`)

const trafficStatusBeforePurchase =
    await sdk.tokenStandard!.getMemberTrafficStatus(participantId!)

const [buyTrafficCommand, buyTrafficDisclosedContracts] =
    await sdk.tokenStandard!.buyMemberTraffic(
        sender?.partyId!,
        200000,
        participantId!,
        []
    )

logger.info(buyTrafficCommand)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    buyTrafficCommand,
    [
        {
            partyId: sender!.partyId,
            privateKey: keyPairSender.privateKey,
        },
    ],
    v4(),
    buyTrafficDisclosedContracts
)

logger.info(
    `buy member traffic for sender (${sender?.partyId}) party completed ${sender?.partyId}`
)

const trafficStatusAfterPurchase =
    await sdk.tokenStandard!.getMemberTrafficStatus(participantId!)

const utxos3 = await sdk.tokenStandard?.listHoldingUtxos()
logger.info(utxos3, 'List Token Standard Holding UTXOs')

await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        logger.info(transactions, 'Token Standard Holding Transactions:')
    })
    .catch((error) => {
        logger.error(
            { error },
            'Error listing token standard holding transactions:'
        )
    })

logger.info('Creating transfer transaction')

const [transferCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        [],
        'memo-ref'
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommand,
    [
        {
            partyId: sender!.partyId,
            privateKey: keyPairSender.privateKey,
        },
    ],
    v4(),
    disclosedContracts2
)

// It can take a moment to process traffic purchase before it is fully reflected in status
// During processing total_limit would have bought amount added, while total_purchased might be not increased yet
await new Promise((resolve) => setTimeout(resolve, 61_000))
const trafficStatusAfterPurchaseAndSomeTime =
    await sdk.tokenStandard!.getMemberTrafficStatus(participantId!)

logger.info(
    {
        trafficStatusBeforePurchase,
        trafficStatusAfterPurchase,
        trafficStatusAfterPurchaseAndSomeTime,
    },
    'MemberTraffic status'
)

logger.info('Submitted transfer transaction')
{
    await sdk.setPartyId(sender!.partyId)
    const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(aliceHoldings, '[ALICE] holding transactions')

    await sdk.setPartyId(receiver!.partyId)
    const bobHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(bobHoldings, '[BOB] holding transactions')
    const transferPreApprovalStatus =
        await sdk.tokenStandard?.getTransferPreApprovalByParty(
            receiver!.partyId,
            'Amulet'
        )
    logger.info(transferPreApprovalStatus, '[BOB] transfer preapproval status')
}
