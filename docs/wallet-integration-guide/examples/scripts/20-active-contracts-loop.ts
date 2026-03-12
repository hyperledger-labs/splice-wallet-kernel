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

const logger = pino({ name: '20-active-contracts-loop', level: 'info' })

const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

const ALICE_UTXOS = 250
const ALICE_SPEND_UTXOS = 10
const BOB_SPEND_UTXOS = 5

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
const validatorOperatorParty = await sdk.validator?.getValidatorUser()!
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.setPartyId(validatorOperatorParty!)

await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

const sender =
    await sdk.userLedger?.signAndAllocateExternalPartyWithPreapproval(
        keyPairSender.privateKey,
        validatorOperatorParty,
        instrumentAdminPartyId,
        'alice'
    )
logger.info(`Created party: ${sender!.partyId}`)

const receiver =
    await sdk.userLedger?.signAndAllocateExternalPartyWithPreapproval(
        keyPairReceiver.privateKey,
        validatorOperatorParty,
        instrumentAdminPartyId,
        'bob'
    )
logger.info(`Created party: ${receiver!.partyId}`)

await sdk.tokenStandard?.createAndSubmitTapInternal(
    validatorOperatorParty!,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

const createTapOperation = async (partyId: PartyId, privateKey: string) => {
    const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
        partyId,
        '1',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        }
    )

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        tapCommand,
        privateKey,
        v4(),
        disclosedContracts
    )
}

await sdk.setPartyId(sender?.partyId!)

// create more than node limit (200 by default) contracts for pagination test
const batchSize = 20
for (let batchStart = 0; batchStart < ALICE_UTXOS; batchStart += batchSize) {
    const batchPromises = Array.from(
        { length: Math.min(batchSize, ALICE_UTXOS - batchStart) },
        (_, idx) => {
            return (async () => {
                await createTapOperation(
                    sender!.partyId,
                    keyPairSender.privateKey
                )
            })()
        }
    )

    await Promise.all(batchPromises)
    logger.info(
        `Created ${Math.min(batchStart + batchSize, ALICE_UTXOS)} TAP loops`
    )
}

logger.info(`Created ${ALICE_UTXOS} TAP loops`)

// send ALICE_SPEND_UTXOS (10) trades to bob
const aliceutxos = await sdk.tokenStandard?.listHoldingUtxos(
    false,
    ALICE_SPEND_UTXOS
)!
for (let trades = 0; trades < ALICE_SPEND_UTXOS; trades++) {
    const [transferCommand, disclosedContracts] =
        await sdk.tokenStandard!.createTransfer(
            sender!.partyId,
            receiver!.partyId,
            '1',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [aliceutxos[trades].contractId],
            'memo-ref',
            undefined,
            undefined,
            undefined,
            true
        )
    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        transferCommand,
        keyPairSender.privateKey,
        v4(),
        disclosedContracts
    )
}

// send BOB_SPEND_UTXOS (5) trades to alice
await sdk.setPartyId(receiver!.partyId)
const bobutxos = await sdk.tokenStandard?.listHoldingUtxos(
    false,
    BOB_SPEND_UTXOS
)!
for (let trades = 0; trades < BOB_SPEND_UTXOS; trades++) {
    const [transferCommand, disclosedContracts] =
        await sdk.tokenStandard!.createTransfer(
            receiver!.partyId,
            sender!.partyId,
            '1',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [bobutxos[trades].contractId],
            'memo-ref',
            undefined,
            undefined,
            undefined,
            true
        )
    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        transferCommand,
        keyPairReceiver.privateKey,
        v4(),
        disclosedContracts
    )
}

const testExistingUtxos = async (
    partyId: PartyId,
    expectedUtxosCount: number,
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

    logger.info({
        expectedUtxosCount,
        actualUtxosCount: utxos?.length,
    })

    if (utxos?.length !== expectedUtxosCount) {
        throw new Error(
            `Expected ${expectedUtxosCount} UTXOs, but found ${utxos?.length}`
        )
    }
}

const httpElementLimit = 200
//check if continueUntilCompletion fetches items above httpElementLimit
await testExistingUtxos(
    sender!.partyId,
    ALICE_UTXOS - ALICE_SPEND_UTXOS + BOB_SPEND_UTXOS,
    httpElementLimit,
    true
)

//check if limit parameter works and does not fetch above httpElementLimit
await testExistingUtxos(
    sender!.partyId,
    Math.min(ALICE_UTXOS, httpElementLimit),
    httpElementLimit,
    false
)
//check if limit parameter works if it is different from ledger
await testExistingUtxos(
    sender!.partyId,
    Math.min(ALICE_UTXOS, httpElementLimit / 2),
    httpElementLimit / 2,
    false
)
//check if continueUntilCompletion works if item count is less than httpElementLimit
await testExistingUtxos(
    receiver!.partyId,
    Math.min(ALICE_SPEND_UTXOS - BOB_SPEND_UTXOS, httpElementLimit),
    httpElementLimit,
    true
)
// check if limit parmeter works if item count is less than httpElementLimit
await testExistingUtxos(
    receiver!.partyId,
    Math.min(ALICE_SPEND_UTXOS - BOB_SPEND_UTXOS, httpElementLimit),
    httpElementLimit,
    false
)
