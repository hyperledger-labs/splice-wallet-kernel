import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
    signTransactionHash,
} from '@canton-network/wallet-sdk'
import { error } from 'console'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '10-idempotent-and-error', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
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

logger.info(`checking idempotent behavior of onboarding`)
const sender2 = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairSender.privateKey,
    'alice'
)

if (sender?.partyId !== sender2?.partyId) {
    throw new Error('onboarding external party is not idempotent')
} else {
    logger.info('alice successfully onboarded twice (idempotent behavior)')
}

await sdk.setPartyId(sender!.partyId)

const receiver = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)
let offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    [
        {
            partyId: sender!.partyId,
            privateKey: keyPairSender.privateKey,
        },
    ],
    v4(),
    disclosedContracts
)

const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)

const [firstSpendCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos?.map((t) => t.contractId),
        'memo-ref'
    )

logger.info('creating double spend')
const [secondSpendCommand, disclosedContracts3] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '200',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos?.map((t) => t.contractId),
        'memo-ref'
    )

offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? offsetLatest

//one of these two commands will fail

const firstSpendCommandId = sdk.userLedger?.prepareSignAndExecuteTransaction(
    firstSpendCommand,
    [
        {
            partyId: sender!.partyId,
            privateKey: keyPairSender.privateKey,
        },
    ],
    v4(),
    disclosedContracts2
)
const secondSpendCommandId = sdk.userLedger?.prepareSignAndExecuteTransaction(
    secondSpendCommand,
    [
        {
            partyId: sender!.partyId,
            privateKey: keyPairSender.privateKey,
        },
    ],
    v4(),
    disclosedContracts3
)

logger.info('Created two transaction using same utxo (double spend)')

try {
    await sdk.userLedger?.waitForCompletion(
        offsetLatest,
        5000,
        (await firstSpendCommandId)!
    )
    await sdk.userLedger?.waitForCompletion(
        offsetLatest,
        5000,
        (await secondSpendCommandId)!
    )
} catch (e: unknown) {
    if (
        typeof e === 'object' &&
        e !== null &&
        'message' in e &&
        (e.message as string).includes('LOCAL_VERDICT_LOCKED_CONTRACTS')
    ) {
        logger.info(
            e,
            'got double spend exception (LOCAL_VERDICT_LOCKED_CONTRACTS)'
        )
    } else throw e
}

logger.info('Submitting identical ping commands to test idempotency')
const createPingCommand = sdk.userLedger?.createPingCommand(sender!.partyId)

const prepareResponse =
    await sdk.userLedger?.prepareSubmission(createPingCommand)

const signedCommandHash = signTransactionHash(
    prepareResponse!.preparedTransactionHash!,
    keyPairSender.privateKey
)

logger.info('Submit command')
const responses: any[] = []

const submissionPromises = []
for (let i = 0; i < 10; i++) {
    const promise = sdk.userLedger
        ?.executeSubmissionAndWaitFor(
            prepareResponse!,
            [
                {
                    partyId: sender!.partyId,
                    publicKey: keyPairSender.publicKey,
                    signature: signedCommandHash,
                },
            ],
            v4()
        )
        .then((response) => {
            responses.push(response)
        })
        .catch((error) => {
            logger.error({ error }, 'Error executing submission')
        })
    submissionPromises.push(promise)
}

// Wait for all submissions to complete
await Promise.all(submissionPromises)

// Check that all objects in responses are identical
if (responses.length == 10) {
    const first = JSON.stringify(responses[0])
    const allIdentical = responses.every((r) => JSON.stringify(r) === first)
    if (!allIdentical) {
        logger.error({ responses }, 'Not all responses are identical!')
        throw new Error('Not all responses are identical!')
    } else {
        logger.info('All responses are identical.')
    }
} else {
    throw new Error(`only received ${responses.length}, expected 10`)
}
