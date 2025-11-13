import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
    LedgerController,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '17-input-cid-filtering', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
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
    keyPairReceiver.privateKey,
    v4()
)

logger.info('transfer pre approval proposal is created')

await sdk.setPartyId(sender?.partyId!)

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000',
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

const utxos = await sdk.tokenStandard?.listHoldingUtxos()
logger.info(utxos, 'List Token Standard Holding UTXOs')

const cId2000 = utxos?.find(
    (e) => parseFloat(e.interfaceViewValue.amount) === 2000
)?.contractId!

try {
    logger.info(
        'Creating transfer transaction with not enough holdings from the sender'
    )

    const [transferCommand, disclosedContracts] =
        await sdk.tokenStandard!.createTransfer(
            sender!.partyId,
            receiver!.partyId,
            '3000',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [],
            'memo-ref'
        )

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        transferCommand,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts
    )
} catch (e: unknown) {
    if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        (e.message as string).includes(
            "Sender doesn't have sufficient funds for this transfer. Missing amount: 1000"
        )
    ) {
        logger.info(e, 'Received correct error for not having enough funds.')
    } else throw e
}

for (let i = 0; i < 10; i++) {
    const [tapCommand2, disclosedContracts2] =
        await sdk.tokenStandard!.createTap(sender!.partyId, '200', {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        })

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        tapCommand2,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts2
    )
}

// check that if you transfer the exact amount, there is only 1 inputCid of that amount

const [transferCommand2, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '200',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        [],
        'memo-ref'
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommand2,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts2
)

const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()

const transferOutAlice = aliceHoldings?.transactions.find((txs) =>
    txs.events.find(
        (e) =>
            e.label.type === 'TransferOut' &&
            e.label.tokenStandardChoice?.choiceArgument.transfer
                .inputHoldingCids.length === 1
    )
)

if (transferOutAlice === undefined) {
    throw new Error(
        'There were too many inputholding Cids when transferring the exact amount of a utxo'
    )
} else {
    logger.info(`Transfer succeeded with 1 inputHoldingCid with exact amount`)
}

//Test that there are only 6 inputHoldingCids and that the largest utxo is included

const [transferCommand3, disclosedContracts3] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '3000',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        [],
        'memo-ref'
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommand3,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts3
)

const aliceHoldings3 = await sdk.tokenStandard?.listHoldingTransactions()

const transferOutAlice3 = aliceHoldings3?.transactions.find((txs) =>
    txs.events.find(
        (e) =>
            e.label.type === 'TransferOut' &&
            e.label.tokenStandardChoice?.choiceArgument.transfer
                .inputHoldingCids.length === 6 &&
            e.label.tokenStandardChoice?.choiceArgument.transfer.inputHoldingCids.includes(
                cId2000
            )
    )
)

if (transferOutAlice3 === undefined) {
    throw new Error('The input holding cids were not filtered correctly')
} else {
    logger.info(
        `Transfer succeeded with 6 inputHoldingCids with 1 large amount and several small utxos`
    )
}
