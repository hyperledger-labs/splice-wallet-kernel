import pino from 'pino'
import { localNetStaticConfig, SDK } from '@canton-network/wallet-sdk'
import {
    TOKEN_NAMESPACE_CONFIG,
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG,
} from './utils/index.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const logger = pino({ name: 'v1-11-merge-utxos', level: 'info' })

// This example script implements https://docs.digitalasset.com/integrate/devnet/exchange-integration/extensions.html#earning-app-rewards-for-deposits
// It requires the /dars/splice-util-featured-app-proxies-1.1.0.dar which is in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../.localnet/'
const PATH_TO_DAR_IN_LOCALNET =
    '/dars/splice-util-featured-app-proxies-1.1.0.dar'
const SPLICE_UTIL_PROXY_PACKAGE_ID =
    '81dd5a9e5c02d0de03208522a895fb85eeb12fbea4aca7c4ad0ad106f3b0bfce'

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
})

const token = await sdk.token(TOKEN_NAMESPACE_CONFIG)

const amulet = await sdk.amulet(AMULET_NAMESPACE_CONFIG)

const aliceKeys = sdk.keys.generate()
const treasuryKeyPair = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'v1-11-alice',
    })
    .sign(aliceKeys.privateKey)
    .execute()

const treasury = await sdk.party.external
    .create(treasuryKeyPair.publicKey, {
        partyHint: 'v1-11-treasury',
    })
    .sign(treasuryKeyPair.privateKey)
    .execute()

// const exchangeParty = await sdk.validator?.getValidatorUser()

// const synchronizers = await sdk.userLedger?.listSynchronizers()

// const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

// const instrumentAdminPartyId =
//     (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

const here = path.dirname(fileURLToPath(import.meta.url))

const spliceUtilFeaturedAppProxyDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

const darBytes = await fs.readFile(spliceUtilFeaturedAppProxyDarPath)
await sdk.ledger.dar.upload(darBytes, SPLICE_UTIL_PROXY_PACKAGE_ID)

const transferPreApprovalProposal = await amulet.preapproval.command.create({
    parties: {
        receiver: alice.partyId,
    },
})

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: transferPreApprovalProposal,
    })
    .sign(aliceKeys.privateKey)
    .execute({
        partyId: alice.partyId,
    })

const featuredAppRights = await amulet.featuredApp.grant()
logger.info(featuredAppRights, `Featured app rights`)

const aliceTapCreateCommand = await amulet.tap(alice.partyId, '20000000')

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: aliceTapCreateCommand,
    })
    .sign(aliceKeys.privateKey)
    .execute({
        partyId: alice.partyId,
    })

const treasuryTapCreateCommand = await amulet.tap(treasury.partyId, '20000000')

await sdk.ledger
    .prepare({
        partyId: treasury.partyId,
        commands: treasuryTapCreateCommand,
    })
    .sign(treasuryKeyPair.privateKey)
    .execute({
        partyId: treasury.partyId,
    })

logger.info(`Allocated external treasury for the exchange with some funds`)

// const delegateCommand = await sdk.userLedger?.createDelegateProxyCommand(
//     exchangeParty!,
//     treasury!.partyId
// )

const createDelegateProxyCommand = await token.transfer.delegatedProxy.create(
    treasury.partyId
)

// logger.info(delegateCommand, `delegate command:`)

// const delegationContractResult =
//     await sdk.userLedger?.submitCommand(delegateCommand)

// logger.info('Set up wallet provider token standard proxy')

//analogous to the TestSetup script here: https://github.com/hyperledger-labs/splice/blob/5870d2d8b0c6b9dfcf8afe11ab0685e2ee58342f/daml/splice-util-featured-app-proxies-test/daml/Splice/Scripts/TestFeaturedDepositsAndWithdrawals.daml#L147-L161

// logger.info('Funding alice')

// const [tapCommand2, disclosedContracts2] = await sdk.tokenStandard!.createTap(
//     alice!.partyId,
//     '20000000',
//     {
//         instrumentId: 'Amulet',
//         instrumentAdmin: instrumentAdminPartyId,
//     }
// )

// await sdk.userLedger?.prepareSignExecuteAndWaitFor(
//     tapCommand2,
//     aliceKeyPair.privateKey,
//     v4(),
//     disclosedContracts2
// )

const [transferCommand, transferDisclosedContracts] =
    await token.transfer.create({
        sender: alice.partyId,
        recipient: treasury.partyId,
        amount: '100',
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: transferCommand,
        disclosedContracts: transferDisclosedContracts,
    })
    .sign(aliceKeys.privateKey)
    .execute({
        partyId: alice.partyId,
    })

//Treasury can see the pending transfer

// const activeContractsForDeletageProxy =

// const activeContractsForDelegateProxy = await sdk.userLedger?.activeContracts({
//     offset: end?.offset!,
//     filterByParty: true,
//     parties: [treasury?.partyId!],
//     templateIds: [
//         '#splice-util-featured-app-proxies:Splice.Util.FeaturedApp.DelegateProxy:DelegateProxy',
//     ],
// })

// const proxyCid = LedgerController.getActiveContractCid(
//     activeContractsForDelegateProxy![0].contractEntry
// )

// logger.info(proxyCid, `Fetched proxyCid`)

// const pendingInstructions =
//     await sdk.tokenStandard?.fetchPendingTransferInstructionView()

// const transferCid = pendingInstructions?.[0].contractId!

// const [acceptCommand, disclosedContracts4] =
//     await sdk.tokenStandard?.exerciseTransferInstructionChoiceWithDelegate(
//         transferCid,
//         'Accept',
//         proxyCid!,
//         featuredAppRights?.contract_id!,
//         [
//             {
//                 beneficiary: exchangeParty!,
//                 weight: 1.0,
//             },
//         ],
//         featuredAppRights!
//     )!

// try {
//     await sdk.userLedger?.prepareSignExecuteAndWaitFor(
//         acceptCommand,
//         treasuryKeyPair.privateKey,
//         v4(),
//         disclosedContracts4
//     )
// } catch (error) {
//     logger.error({ error }, 'Failed to accept transfer')
// }

const aliceUtxos = await token.utxos.list({
    partyId: alice.partyId,
})

const treasuryUtxos = await token.utxos.list({
    partyId: treasury.partyId,
})

logger.info({
    aliceUtxos,
    treasuryUtxos,
})
