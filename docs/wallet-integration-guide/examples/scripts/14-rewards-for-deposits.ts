import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import path from 'path'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const logger = pino({ name: '14-rewards-for-deposits', level: 'info' })

// This example script implements https://docs.digitalasset.com/integrate/devnet/exchange-integration/extensions.html#earning-app-rewards-for-deposits
// It requires the /dars/splice-util-featured-app-proxies-1.1.0.dar which is in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET =
    '/dars/splice-util-featured-app-proxies-1.1.0.dar'
const SPLICE_UTIL_PROXY_PACKAGE_ID =
    '81dd5a9e5c02d0de03208522a895fb85eeb12fbea4aca7c4ad0ad106f3b0bfce'

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

const treasuryKeyPair = createKeyPair()
const aliceKeyPair = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

//set up alice with a preapproval from her validator operator
const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    aliceKeyPair.privateKey,
    'alice'
)

const exchangeParty = await sdk.validator?.getValidatorUser()

logger.info(`Created party: ${alice?.partyId}`)

await sdk.setPartyId(alice!.partyId)

const synchronizers = await sdk.userLedger?.listSynchronizers()

const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

logger.info(`synchronizer id is ${synchonizerId}`)
sdk.userLedger?.setSynchronizerId(synchonizerId)
sdk.tokenStandard?.setSynchronizerId(synchonizerId)
sdk.adminLedger?.setSynchronizerId(synchonizerId)

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

const transferPreApprovalProposal =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        exchangeParty!,
        alice?.partyId!,
        instrumentAdminPartyId
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    [transferPreApprovalProposal],
    aliceKeyPair.privateKey,
    v4()
)

//upload splice-util-featured-app-proxies dar
const here = path.dirname(fileURLToPath(import.meta.url))

const spliceUtilFeaturedAppProxyDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

const isDarUploaded = await sdk.userLedger?.isPackageUploaded(
    SPLICE_UTIL_PROXY_PACKAGE_ID
)
logger.info(
    { isDarUploaded },
    'Status of splice-util-featured-app-proxies dar upload'
)

if (!isDarUploaded) {
    try {
        const darBytes = await fs.readFile(spliceUtilFeaturedAppProxyDarPath)
        await sdk.adminLedger?.uploadDar(darBytes)
        logger.info(
            'splice-util-featured-app-proxies DAR ensured on participant (uploaded or already present)'
        )
    } catch (e) {
        logger.error(
            { e, spliceUtilFeaturedAppProxyDarPath },
            'Failed to ensure splice-util-featured-app-proxies DAR uploaded'
        )
        throw e
    }
}

//featured exchange party is just the validator operator party
await sdk.setPartyId(exchangeParty!)
await sdk.tokenStandard?.createAndSubmitTapInternal(
    exchangeParty!,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)
await sdk.tokenStandard?.grantFeatureAppRightsForInternalParty()
const featuredAppRights = await sdk.tokenStandard!.lookupFeaturedApps()
logger.info(featuredAppRights, `Featured app rights`)

//set up treasury party for exchange
const treasuryParty = await sdk.adminLedger?.signAndAllocateExternalParty(
    treasuryKeyPair.privateKey,
    'TreasuryParty'
)

logger.info(`Created party: ${treasuryParty?.partyId}`)

await sdk.setPartyId(treasuryParty?.partyId!)

const [tapCommand1, disclosedContracts] = await sdk.tokenStandard!.createTap(
    treasuryParty!.partyId,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand1,
    treasuryKeyPair.privateKey,
    v4(),
    disclosedContracts
)
await sdk.userLedger?.grantRights([exchangeParty!], [exchangeParty!])

await new Promise((res) => setTimeout(res, 5000))

logger.info(`Allocated external treasury for the exchange with some funds`)

await sdk.setPartyId(exchangeParty!)

const delegateCommand = await sdk.userLedger?.createDelegateProxyCommand(
    exchangeParty!,
    treasuryParty!.partyId
)

logger.info(delegateCommand, `delegate command:`)

const delegationContractResult =
    await sdk.userLedger?.submitCommand(delegateCommand)

logger.info('Set up wallet provider token standard proxy')

//analogous to the TestSetup script here: https://github.com/hyperledger-labs/splice/blob/5870d2d8b0c6b9dfcf8afe11ab0685e2ee58342f/daml/splice-util-featured-app-proxies-test/daml/Splice/Scripts/TestFeaturedDepositsAndWithdrawals.daml#L147-L161

logger.info('funding alice')
await sdk.setPartyId(alice?.partyId!)

const [tapCommand2, disclosedContracts2] = await sdk.tokenStandard!.createTap(
    alice!.partyId,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand2,
    aliceKeyPair.privateKey,
    v4(),
    disclosedContracts2
)

//TODO: add check that a two-step deposit can be executed

logger.info('Creating transfer transaction')

const [transferCommand, disclosedContracts3] =
    await sdk.tokenStandard!.createTransfer(
        alice!.partyId,
        treasuryParty!.partyId,
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
    aliceKeyPair.privateKey,
    v4(),
    disclosedContracts3
)
logger.info('Submitted transfer transaction')

//Treasury can see the pending transfer

logger.info(`Fetching proxyCid`)
const end = await sdk.userLedger?.ledgerEnd()

await sdk.setPartyId(treasuryParty!.partyId)

const activeContractsForDelegateProxy = await sdk.userLedger?.activeContracts({
    offset: end?.offset!,
    filterByParty: true,
    parties: [treasuryParty?.partyId!],
    templateIds: [
        '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
    ],
})

const proxyCid =
    activeContractsForDelegateProxy![0].contractEntry.JsActiveContract
        ?.createdEvent.contractId

logger.info(proxyCid, `Fetched proxyCid`)

const pendingInstructions =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()

const transferCid = pendingInstructions?.[0].contractId!

const [acceptCommand, disclosedContracts4] =
    await sdk.tokenStandard?.exerciseTransferInstructionChoiceWithDelegate(
        transferCid,
        'Accept',
        proxyCid!,
        featuredAppRights?.contract_id!,
        [
            {
                beneficiary: exchangeParty!,
                weight: 1.0,
            },
        ]
    )!

const delegateProxyDisclosedContracts = {
    templateId: featuredAppRights?.template_id!,
    contractId: featuredAppRights?.contract_id!,
    createdEventBlob: featuredAppRights?.created_event_blob!,
    synchronizerId: synchonizerId,
}

try {
    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        acceptCommand,
        treasuryKeyPair.privateKey,
        v4(),
        [delegateProxyDisclosedContracts, ...disclosedContracts4]
    )
} catch (error) {
    logger.error({ error }, 'Failed to accept transfer')
}

{
    await sdk.setPartyId(treasuryParty!.partyId)
    const treasuryHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(treasuryHoldings, '[TREASURY PARTY] holding transactions')

    await sdk.setPartyId(alice!.partyId)
    const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(aliceHoldings, '[ALICE] holding transactions')
}
