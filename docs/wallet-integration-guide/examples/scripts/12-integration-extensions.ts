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
import path from 'path'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const logger = pino({ name: '11-integration-extensions', level: 'info' })

// This example script implements https://docs.digitalasset.com/integrate/devnet/exchange-integration/extensions.html#optimizing-app-rewards
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

const keyPairTreasury = createKeyPair()
const receiverPartyKeyPair = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const treasuryParty = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairTreasury.privateKey,
    'alice'
)

logger.info(`Created party: ${treasuryParty!.partyId}`)
await sdk.setPartyId(treasuryParty!.partyId)

const synchronizers = await sdk.userLedger?.listSynchronizers()

const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

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

const exchangeParty = await sdk.validator?.getValidatorUser()

await sdk.userLedger?.grantRights([exchangeParty!], [exchangeParty!])

sdk.tokenStandard?.setSynchronizerId(synchonizerId)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
await new Promise((res) => setTimeout(res, 5000))

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

await new Promise((res) => setTimeout(res, 5000))

logger.info('creating transfer preapproval proposal')

await sdk.setPartyId(exchangeParty!)
await sdk.tokenStandard?.createAndSubmitTapInternal(
    exchangeParty!,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.setPartyId(treasuryParty?.partyId!)

const [tapCommand1, disclosedContracts3] = await sdk.tokenStandard!.createTap(
    treasuryParty!.partyId,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand1,
    keyPairTreasury.privateKey,
    v4(),
    disclosedContracts3
)

const transferPreApprovalProposal =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        exchangeParty!,
        treasuryParty?.partyId!,
        instrumentAdminPartyId
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    [transferPreApprovalProposal],
    keyPairTreasury.privateKey,
    v4()
)

logger.info('transfer pre approval proposal is created')

await new Promise((res) => setTimeout(res, 5000))

await sdk.setPartyId(exchangeParty!)

const delegateCommand = await sdk.userLedger?.createDelegateProxyCommand(
    exchangeParty!,
    treasuryParty!.partyId
)

const delegationContractResult =
    await sdk.userLedger?.submitCommand(delegateCommand)

logger.info(delegationContractResult, 'delegate result')
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

logger.info(proxyCid, `proxyCid`)

await sdk.setPartyId(exchangeParty!)

const featuredAppRights =
    await sdk.tokenStandard!.grantFeatureAppRightsForInternalParty()

const receiverParty = await sdk.topology?.prepareSignAndSubmitExternalParty(
    receiverPartyKeyPair.privateKey,
    'bob'
)

await sdk.setPartyId(receiverParty?.partyId!)

const transferPreApprovalProposalReceiver =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        exchangeParty!,
        receiverParty?.partyId!,
        instrumentAdminPartyId
    )

const bobPreapproval = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    [transferPreApprovalProposalReceiver],
    receiverPartyKeyPair.privateKey,
    v4()
)
logger.info(bobPreapproval, 'created pre approval for bob')

await new Promise((res) => setTimeout(res, 5000))

await sdk.setPartyId(treasuryParty?.partyId!)

const [transferCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransferUsingDelegateProxy(
        exchangeParty!,
        proxyCid!,
        featuredAppRights?.contract_id!,
        treasuryParty?.partyId!,
        receiverParty?.partyId!,
        '100',
        'Amulet',
        instrumentAdminPartyId,
        [],
        'memo-ref'
    )

await new Promise((res) => setTimeout(res, 5000))

logger.debug(transferCommand, `created delegate exercise command`)

const result = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    transferCommand,
    keyPairTreasury.privateKey,
    v4(),
    disclosedContracts2
)

logger.debug(result, `submitted command`)

await new Promise((res) => setTimeout(res, 5000))

{
    await sdk.setPartyId(treasuryParty!.partyId)
    const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(aliceHoldings, '[ALICE] holding transactions')

    await sdk.setPartyId(receiverParty!.partyId)
    const bobHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(bobHoldings, '[BOB] holding transactions')
    const transferPreApprovalStatus =
        await sdk.tokenStandard?.getTransferPreApprovalByParty(
            receiverParty!.partyId,
            'Amulet'
        )
    logger.info(transferPreApprovalStatus, '[BOB] transfer preapproval status')

    await sdk.setPartyId(exchangeParty!)
    const appRewardCoupons = await sdk.userLedger?.getAppRewardCoupons()
    logger.info(appRewardCoupons, `[EXCHANGE PARTY] app reward coupons`)
}
