import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import path from 'path'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import fs from 'fs/promises'

const logger = pino({ name: '18-merge-delegation-porposal', level: 'info' })

// This example script implements https://docs.digitalasset.com/integrate/devnet/exchange-integration/extensions.html#optimizing-app-rewards
// It requires the /dars/splice-util-token-standard-wallet-1.0.0.dar which is in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET =
    '/dars/splice-util-token-standard-wallet-1.0.0.dar'
const SPLICE_UTIL_TOKEN_STANDARD_WALLET_PACKAGE_ID =
    '1da198cb7968fa478cfa12aba9fdf128a63a8af6ab284ea6be238cf92a3733ac'

const here = path.dirname(fileURLToPath(import.meta.url))

const spliceUtilTokenStandardWalletDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

// TODO:remove once mainnet is upgraded
// this will fail on CI for the sdk-e2e (mainnet) task because the dar is not in the localnet distribution for the current version.

if (!existsSync(spliceUtilTokenStandardWalletDarPath)) {
    logger.warn(
        `DAR NOT FUND AT ${spliceUtilTokenStandardWalletDarPath}. Skipping test.`
    )
    process.exit(0)
}

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
await sdk.connectAdmin()
logger.info('Connected to ledger')

const keyPairAlice = createKeyPair()

await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairAlice.privateKey,
    'alice'
)
logger.info(`Created party: ${alice!.partyId}`)
await sdk.setPartyId(alice!.partyId)

const synchronizers = await sdk.userLedger?.listSynchronizers()

const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

const isDarUploaded = await sdk.userLedger?.isPackageUploaded(
    SPLICE_UTIL_TOKEN_STANDARD_WALLET_PACKAGE_ID
)
logger.info(
    { isDarUploaded },
    'Status of splice-util-token-standard-wallet dar upload'
)

if (!isDarUploaded) {
    try {
        const darBytes = await fs.readFile(spliceUtilTokenStandardWalletDarPath)
        await sdk.adminLedger?.uploadDar(darBytes)
        logger.info(
            'splice-util-token-standard-wallet DAR ensured on participant (uploaded or already present)'
        )
    } catch (e) {
        logger.error(
            { e, spliceUtilTokenStandardWalletDarPath },
            'Failed to ensure splice-util-token-standard-wallet DAR uploaded'
        )
        throw e
    }
}

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
        [
            {
                partyId: alice!.partyId,
                privateKey: keyPairAlice.privateKey,
            },
        ],
        v4(),
        disclosedContracts2
    )
}

const utxsosAfterTapping = await sdk.tokenStandard?.listHoldingUtxos()

logger.info(utxsosAfterTapping?.length)

const validatorOperatorParty = await sdk.validator?.getValidatorUser()!

logger.info('creating batch merge utility -- setupWalletOperator')
//following this test:https://github.com/hyperledger-labs/splice/blob/25e2d73c1c42fc55173813b489a63e0713c2d52f/daml/splice-util-token-standard-wallet-test/daml/Splice/Util/Token/Wallet/IntegrationTests/TestMergeDelegation.daml#L150

await sdk.setPartyId(validatorOperatorParty)
const createBatchMergeUtility =
    await sdk.tokenStandard?.createBatchMergeUtility()

await sdk.userLedger?.submitCommand(createBatchMergeUtility, v4())

logger.info('created batch merge utility contract')

await sdk.setPartyId(alice?.partyId!)

logger.info('creating merge delegation proposal')
const createMergeDelegationProposal =
    await sdk.tokenStandard?.createMergeDelegationProposal(
        validatorOperatorParty
    )

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    createMergeDelegationProposal,
    [
        {
            partyId: alice!.partyId,
            privateKey: keyPairAlice.privateKey,
        },
    ],
    v4(),
    []
)

logger.info('created merge delegation proposal')

await sdk.setPartyId(validatorOperatorParty!)

logger.info('approving merge delegation proposal as the delegate')

const [command, mergeDelegationProposalDisclosedContract] =
    await sdk.tokenStandard?.approveMergeDelegationProposal(alice?.partyId)!

const submitMergeDelegationApproval = await sdk.userLedger?.submitCommand(
    command,
    v4(),
    mergeDelegationProposalDisclosedContract
)

logger.info('approved merge delegation proposal')

logger.info('Creating batch merge utility')
// using merge delegations

const [mergeExerciseCommand, mergeDisclosedContracts] =
    await sdk.tokenStandard?.useMergeDelegations(alice?.partyId!)!

await sdk.userLedger?.submitCommand(
    mergeExerciseCommand,
    v4(),
    mergeDisclosedContracts
)

await sdk.setPartyId(alice?.partyId!)

const utxosAfterMerge = await sdk.tokenStandard?.listHoldingUtxos()

if (!utxosAfterMerge || utxosAfterMerge?.length > 1) {
    throw new Error(
        `Utxos didn't merge correctly. Expected 1 utxo, found ${utxosAfterMerge?.length}`
    )
} else {
    logger.info(
        `merge via delegate was successful. previous number of utxos: ${utxsosAfterTapping?.length} new number: ${utxosAfterMerge?.length}`
    )
}
