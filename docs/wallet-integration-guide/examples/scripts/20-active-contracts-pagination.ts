import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '20-pagination', level: 'info' })

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

// create more than 200 contracts for pagination test
const UTXOS_AMOUNT = 500
const batchSize = 10
for (let batchStart = 0; batchStart < UTXOS_AMOUNT; batchStart += batchSize) {
    const batchPromises = Array.from(
        { length: Math.min(batchSize, UTXOS_AMOUNT - batchStart) },
        (_, idx) => {
            const i = batchStart + idx
            return (async () => {
                let retries = 0
                const maxRetries = 10
                let success = false

                while (!success && retries < maxRetries) {
                    try {
                        const [tapCommand, disclosedContracts] =
                            await sdk.tokenStandard!.createTap(
                                sender!.partyId,
                                '1',
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
                        success = true
                    } catch (error: any) {
                        if (
                            error.message?.includes(
                                'OpenMiningRound active at current moment not found'
                            )
                        ) {
                            retries++
                            logger.info(
                                `No active mining round, waiting 2 seconds... (retry ${retries}/${maxRetries})`
                            )
                            await new Promise((resolve) =>
                                setTimeout(resolve, 2000)
                            )
                        } else {
                            throw error
                        }
                    }
                }

                if (!success) {
                    throw new Error(
                        `Failed to create TAP after ${maxRetries} retries. No active mining round available.`
                    )
                }
            })()
        }
    )

    await Promise.all(batchPromises)
    logger.info(
        `Created ${Math.min(batchStart + batchSize, 205)} TAP operations`
    )
}

const utxosAlice = await sdk.tokenStandard?.listHoldingUtxos(false, 1000)
logger.info(`number of unlocked utxos for alice ${utxosAlice?.length}`)
