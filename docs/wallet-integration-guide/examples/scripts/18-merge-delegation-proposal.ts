import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    localValidatorDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import path from 'path'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { DisclosedContract } from '@canton-network/core-ledger-client'
import { create } from 'domain'
import { PartyId } from '@canton-network/core-types'

const logger = pino({ name: '18-merge-delegation-porposal', level: 'info' })

// This example script implements https://docs.digitalasset.com/integrate/devnet/exchange-integration/extensions.html#optimizing-app-rewards
// It requires the /dars/splice-util-token-standard-wallet-1.0.0.dar which is in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET =
    '/dars/splice-util-token-standard-wallet-1.0.0.dar'
const SPLICE_UTIL_PROXY_PACKAGE_ID =
    '1da198cb7968fa478cfa12aba9fdf128a63a8af6ab284ea6be238cf92a3733ac'

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
await sdk.connectAdmin()
logger.info('Connected to ledger')

const keyPairTreasury = createKeyPair()

await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairTreasury.privateKey,
    'alice'
)
logger.info(`Created party: ${alice!.partyId}`)
await sdk.setPartyId(alice!.partyId)

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
    'Status of splice-util-token-standard-wallet dar upload'
)

if (!isDarUploaded) {
    try {
        const darBytes = await fs.readFile(spliceUtilFeaturedAppProxyDarPath)
        await sdk.adminLedger?.uploadDar(darBytes)
        logger.info(
            'splice-util-token-standard-wallet DAR ensured on participant (uploaded or already present)'
        )
    } catch (e) {
        logger.error(
            { e, spliceUtilFeaturedAppProxyDarPath },
            'Failed to ensure splice-util-token-standard-wallet DAR uploaded'
        )
        throw e
    }
}

sdk.tokenStandard?.setSynchronizerId(synchonizerId)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

for (let i = 0; i < 13; i++) {
    const [tapCommand2, disclosedContracts2] =
        await sdk.tokenStandard!.createTap(alice!.partyId, '200', {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        })

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        tapCommand2,
        keyPairTreasury.privateKey,
        v4(),
        disclosedContracts2
    )
}

const utxsosAfterTapping = await sdk.tokenStandard?.listHoldingUtxos()

logger.info(utxsosAfterTapping?.length)

const validatorOperatorParty = await sdk.validator?.getValidatorUser()!

logger.info('creating batch merge utility -- setupWalletOperator')
//following this test:https://github.com/hyperledger-labs/splice/blob/25e2d73c1c42fc55173813b489a63e0713c2d52f/daml/splice-util-token-standard-wallet-test/daml/Splice/Util/Token/Wallet/IntegrationTests/TestMergeDelegation.daml#L150

const createBatchMergeUtilityTreasury =
    await sdk.tokenStandard?.createBatchMergeUtility()

logger.info(createBatchMergeUtilityTreasury)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    createBatchMergeUtilityTreasury,
    keyPairTreasury.privateKey,
    v4()
)

logger.info('created BatchmergeUtility contract')

// await sdk.setPartyId(alice?.partyId!)

// await sdk.userLedger?.grantRights([alice?.partyId!], [alice?.partyId!])

try {
    logger.info('creating merge delegation proposal')
    const createMergeDelegationProposal =
        await sdk.tokenStandard?.createMergeDelegationProposal(
            validatorOperatorParty
        )
    logger.info(createMergeDelegationProposal)

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        createMergeDelegationProposal,
        keyPairTreasury.privateKey,
        v4(),
        []
    )
} catch (e) {
    logger.error(e)
}

const ledgerEnd = await sdk.userLedger?.ledgerEnd()
const activeContractsResult = await sdk.userLedger?.activeContracts({
    offset: ledgerEnd?.offset!,
    templateIds: [
        '#splice-util-token-standard-wallet:Splice.Util.Token.Wallet.MergeDelegation:MergeDelegationProposal',
    ],
    parties: [alice?.partyId!],
    filterByParty: true,
})

logger.info(activeContractsResult)

if (activeContractsResult === undefined || activeContractsResult.length === 0) {
    throw new Error('no merge delegation proposals')
}
logger.info('created merge delegation proposal')

const dc: DisclosedContract = {
    templateId:
        activeContractsResult[0].contractEntry.JsActiveContract?.createdEvent
            .templateId!,
    contractId:
        activeContractsResult[0].contractEntry.JsActiveContract?.createdEvent
            .contractId!,
    createdEventBlob:
        activeContractsResult[0].contractEntry.JsActiveContract?.createdEvent
            .createdEventBlob!,
    synchronizerId: synchonizerId,
}

logger.info('approving merge delegation proposal')

const [command, blah] = await sdk.tokenStandard?.approveMergeDelegationProposal(
    activeContractsResult[0].contractEntry.JsActiveContract?.createdEvent
        .contractId!
)!

logger.info(command)

try {
    await sdk.setPartyId(validatorOperatorParty!)
    const b = await sdk.userLedger?.submitCommand(command, v4(), [dc])

    logger.info(b)

    logger.info('approved merge delegation proposal by exercisng Accept choice')
} catch (e) {
    logger.error(e)
}

// using merge delegations

try {
    //todo: only create batch merge utility if it doesn't exist
    const createBatchMergeUtilityTreasury =
        await sdk.tokenStandard?.createBatchMergeUtility()

    logger.info(createBatchMergeUtilityTreasury)

    await sdk.userLedger?.submitCommand(createBatchMergeUtilityTreasury, v4())
    const [mergeExerciseCommand, mergeDisclosedContracts] =
        await sdk.tokenStandard?.useMergeDelegations(alice?.partyId!)!

    logger.info(mergeExerciseCommand)

    const res = await sdk.userLedger?.submitCommand(
        mergeExerciseCommand,
        v4(),
        mergeDisclosedContracts
    )
    logger.info(res)
} catch (e) {
    logger.error(e)
}

await sdk.setPartyId(alice?.partyId!)

logger.info(utxsosAfterTapping?.length, 'alice utxos before the merge')

const utxosAfterMerge = await sdk.tokenStandard?.listHoldingUtxos()

logger.info(utxosAfterMerge?.length, 'alice utxos after merge')
