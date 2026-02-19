import { PartyId } from '@canton-network/core-types'
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

logger.info('transfer pre approval proposal is created')

const createTapOperation = async (partyId: PartyId, privateKey: string) => {
    let retries = 0
    const maxRetries = 10
    let success = false

    while (!success && retries < maxRetries) {
        try {
            const [tapCommand, disclosedContracts] =
                await sdk.tokenStandard!.createTap(partyId, '1', {
                    instrumentId: 'Amulet',
                    instrumentAdmin: instrumentAdminPartyId,
                })

            await sdk.userLedger?.prepareSignExecuteAndWaitFor(
                tapCommand,
                privateKey,
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
                await new Promise((resolve) => setTimeout(resolve, 2000))
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
}

await sdk.setPartyId(sender?.partyId!)

// create more than node limit (200 by default) contracts for pagination test
const ALICE_UTXOS_AMOUNT = 250
const BOB_UTXOS_AMOUNT = 4
const batchSize = 20
for (
    let batchStart = 0;
    batchStart < ALICE_UTXOS_AMOUNT;
    batchStart += batchSize
) {
    const batchPromises = Array.from(
        { length: Math.min(batchSize, ALICE_UTXOS_AMOUNT - batchStart) },
        (_, idx) => {
            return (async () => {
                await createTapOperation(
                    sender!.partyId,
                    keyPairSender.privateKey
                )
                const shouldCreateOtherPartyTap =
                    [1, 2, 5].includes(idx) && batchStart === 0
                // test if we loop over another party's contracts
                if (shouldCreateOtherPartyTap) {
                    await sdk.setPartyId(receiver?.partyId!)
                    await createTapOperation(
                        receiver!.partyId,
                        keyPairReceiver.privateKey
                    )
                    await sdk.setPartyId(sender?.partyId!)
                }
            })()
        }
    )

    await Promise.all(batchPromises)
    logger.info(
        `Created ${Math.min(batchStart + batchSize, ALICE_UTXOS_AMOUNT)} TAP loops`
    )
}

await sdk.setPartyId(receiver?.partyId!)
await createTapOperation(receiver!.partyId, keyPairReceiver.privateKey)

await sdk.setPartyId(sender?.partyId!)

const AMOUNT_TO_SEND = 1

const [transferCommand, disclosedContracts] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        AMOUNT_TO_SEND.toString(),
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

const testExistingUtxos = async (
    partyId: PartyId,
    expectedUtxosAmount: number,
    limit = 200,
    continueUntilCompletion?: boolean
) => {
    await sdk.setPartyId(partyId)
    const utxos = await sdk.tokenStandard?.listHoldingUtxos(
        true,
        limit,
        undefined,
        undefined,
        continueUntilCompletion
    ) // 200 is the http-list-max-elements-limit default
    logger.info(`number of unlocked utxos for ${partyId}: ${utxos?.length}`)

    const sumAmountFromUtxos = utxos?.reduce(
        (acc, value) => acc + +value.interfaceViewValue.amount,
        0
    )

    logger.info({
        expectedUtxosAmount,
        sumAmountFromUtxos,
    })

    if (sumAmountFromUtxos !== expectedUtxosAmount) {
        throw new Error(
            `sumAmountFromUtxos (${sumAmountFromUtxos}) should be equal to totalAmount (${expectedUtxosAmount})`
        )
    }

    logger.info({ partyId }, 'TEST SUCCESSFUL for')
}

await testExistingUtxos(
    sender!.partyId,
    ALICE_UTXOS_AMOUNT - AMOUNT_TO_SEND,
    200,
    true
)

await testExistingUtxos(receiver!.partyId, BOB_UTXOS_AMOUNT, 200, true)
