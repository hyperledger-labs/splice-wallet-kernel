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
    name: '14-token-standard-preapproval-renew-cancel-localnet',
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

const receiver = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

const validatorOperatorParty = await sdk.validator?.getValidatorUser()

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

await sdk.setPartyId(receiver!.partyId)

logger.info('Creating transfer preapproval proposal')

{
    await sdk.setPartyId(validatorOperatorParty!)
    await sdk.tokenStandard?.createAndSubmitTapInternal(
        validatorOperatorParty!,
        '20000000',
        { instrumentId: 'Amulet', instrumentAdmin: instrumentAdminPartyId }
    )
}

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

const preapproval = await sdk.tokenStandard!.waitForPreapprovalFromScanProxy(
    receiver!.partyId,
    'Amulet'
)

if (!preapproval) {
    throw new Error('Unexpected lack of transfer preapproval')
}

logger.info('Renewing transfer preapproval (manual)')

sdk.setPartyId(validatorOperatorParty!)
const [renewCmd, disclosedContractsRenew] =
    await sdk.tokenStandard!.createRenewTransferPreapproval(
        preapproval.contractId,
        preapproval.templateId,
        validatorOperatorParty!
    )
await sdk.userLedger!.submitCommand(renewCmd!, v4(), disclosedContractsRenew)
logger.info('Transfer preapproval renewed')

// After TransferPreapproval_Renew a new contract is created on the ledger
// Source we fetch TransferPreapprovals from (scan proxy api) is lagging behind a bit
// and may return previous contract ID which is already archived
// so calling TransferPreapproval_Cancel on it would cause error
// That function waits until getTransferPreApprovalByParty returns new CID
logger.info('Assuring scanProxy API refresh transfer preapproval after renew')

const preapprovalAfterRenewal =
    await sdk.tokenStandard!.waitForPreapprovalFromScanProxy(
        receiver!.partyId,
        'Amulet',
        {
            oldCid: preapproval.contractId,
        }
    )
if (!preapprovalAfterRenewal) {
    throw new Error('Unexpected lack of transfer preapproval after renewal')
}

logger.info('Cancelling transfer preapproval')
sdk.setPartyId(receiver!.partyId!)
const [cancelCmd, disclosedContractsCancel] =
    await sdk.tokenStandard!.createCancelTransferPreapproval(
        preapprovalAfterRenewal.contractId,
        preapprovalAfterRenewal.templateId,
        receiver!.partyId
    )
await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    [cancelCmd!],
    keyPairReceiver.privateKey,
    v4(),
    disclosedContractsCancel
)
logger.info('Transfer preapproval cancelled')

async function waitForPreapprovalCidChange(
    receiverId: string,
    instrumentId: string,
    oldCid: string,
    intervalMs: number = 15_000,
    timeoutMs: number = 5 * 60_000
): Promise<void> {
    const deadline = Date.now() + timeoutMs

    for (let attempt = 1; Date.now() < deadline; attempt++) {
        try {
            const latest =
                await sdk.tokenStandard!.getTransferPreApprovalByParty(
                    receiverId,
                    instrumentId
                )

            if (latest?.contractId && latest.contractId !== oldCid) {
                return
            }

            logger.info(
                { attempt, seenCid: latest?.contractId ?? null, oldCid },
                'Preapproval CID unchanged - polling again'
            )
        } catch (err) {
            logger.warn(
                { attempt, err },
                'Error fetching preapproval - retrying'
            )
        }

        await new Promise((r) => setTimeout(r, intervalMs))
    }

    throw new Error(
        `Timed out after ${timeoutMs / 1000}s waiting for TransferPreapproval CID to change from ${oldCid}`
    )
}
