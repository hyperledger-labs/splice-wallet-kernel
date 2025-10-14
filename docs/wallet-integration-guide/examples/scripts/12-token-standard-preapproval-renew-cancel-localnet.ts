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

const logger = pino({
    name: '12-token-standard-preapproval-renew-cancel-localnet',
    level: 'info',
})

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localValidatorDefault,
})

logger.info('SDK initialized')
await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectAdmin()
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

await sdk.setPartyId(receiver!.partyId)
const validatorOperatorParty = await sdk.validator?.getValidatorUser()

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

async function waitForActivePreapproval(
    receiverPid: string,
    instrumentId: string,
    timeoutMs = 30000
) {
    const start = Date.now()
    await new Promise((r) => setTimeout(r, 1000))

    while (Date.now() - start < timeoutMs) {
        const tp = await sdk.tokenStandard?.getTransferPreApprovalByParty(
            receiverPid as any,
            instrumentId
        )
        if (tp) return tp
        await new Promise((r) => setTimeout(r, 1000))
    }
    throw new Error(
        `Timed out waiting for active TransferPreapproval for receiver ${receiverPid}`
    )
}

logger.info('Creating transfer preapproval proposal')

// fund validator operator so it can accept automatically, like your original flow
await sdk.setPartyId(validatorOperatorParty!)
await sdk.tokenStandard?.createAndSubmitTapInternal(
    validatorOperatorParty!,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.setPartyId(receiver!.partyId)
const createProposalCmd =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        validatorOperatorParty!,
        receiver!.partyId,
        instrumentAdminPartyId
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    [createProposalCmd!],
    keyPairReceiver.privateKey,
    v4()
)
logger.info('Transfer preapproval proposal created')

logger.info('Waiting for active TransferPreapproval to appear…')
await waitForActivePreapproval(receiver!.partyId, 'Amulet')

logger.info('Renewing transfer preapproval (manual)')
{
    // sdk.setPartyId(validatorOperatorParty)
    const [renewCmd, disclosed] =
        await sdk.tokenStandard?.renewTransferPreapproval(
            validatorOperatorParty!,
            receiver!.partyId
        )
    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        renewCmd!,
        keyPairReceiver.privateKey,
        v4(),
        disclosed
    )
    logger.info('Transfer preapproval renewed')
}

logger.info('Cancelling transfer preapproval auto-renew')
{
    const cancelCmd =
        await sdk.userLedger?.createCancelTransferPreapprovalCommand(
            validatorOperatorParty!,
            receiver!.partyId
        )
    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        [cancelCmd!],
        keyPairReceiver.privateKey,
        v4()
    )
    logger.info('Transfer preapproval auto-renew cancelled')
}

await sdk.setPartyId(sender!.partyId)
const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '20000000',
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

await sdk.tokenStandard?.listHoldingTransactions().then(
    (transactions) =>
        logger.info(transactions, 'Token Standard Holding Transactions:'),
    (error) =>
        logger.error(
            { error },
            'Error listing token standard holding transactions:'
        )
)

logger.info('Creating transfer transaction')
const [transferCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        { instrumentId: 'Amulet', instrumentAdmin: instrumentAdminPartyId },
        [],
        'memo-ref'
    )
await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts2
)
logger.info('Submitted transfer transaction')

await sdk.setPartyId(validatorOperatorParty!)
const validatorFeatureAppRights =
    await sdk.tokenStandard!.grantFeatureAppRightsForInternalParty()
logger.info(
    validatorFeatureAppRights,
    `Featured App Rights for validator ${validatorOperatorParty}`
)

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
