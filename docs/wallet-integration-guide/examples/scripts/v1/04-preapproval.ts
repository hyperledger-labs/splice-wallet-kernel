import { Holding, PrettyContract } from '@canton-network/core-tx-parser'
import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

const logger = pino({ name: 'v1-preapproval', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)

const sdk = await Sdk.create({
    authTokenProvider: new AuthTokenProvider(localNetAuth),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'Alice',
    })
    .sign(aliceKeys.privateKey)
    .execute()

const [amuletTapCommand, amuletTapDisclosedContracts] = await sdk.amulet.tap(
    alice.partyId,
    '10000'
)

await (
    await sdk.ledger.prepare({
        partyId: alice.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
)
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

const bobKeys = sdk.keys.generate()

const bob = await sdk.party.external
    .create(bobKeys.publicKey, {
        partyHint: 'Bob',
    })
    .sign(bobKeys.privateKey)
    .execute()

// --- TEST CREATE COMMAND

const createPreapprovalCommand = await sdk.amulet.preapproval.command.create({
    parties: {
        receiver: bob.partyId,
    },
})

logger.info(
    { createPreapprovalCommand },
    'Successfully created a preapproval command'
)
;(
    await sdk.ledger.prepare({
        partyId: bob.partyId,
        commands: createPreapprovalCommand,
    })
)
    .sign(bobKeys.privateKey)
    .execute({
        partyId: bob.partyId,
    })

logger.info('Successfully registered the preapproval.')

logger.info(
    "Fetching for preapproval status. This might take up to 5 minutes... Why don't you go make some coffee?"
)

// --- TEST FETCH

const fetchedPreapprovalStatus = await sdk.amulet.preapproval.fetchStatus(
    bob.partyId
)

logger.info({ fetchedPreapprovalStatus }, 'Fetched preapproval status')

const sentValue = 2000

const [transferCommand, transferDisclosedContracts] =
    await sdk.token.transfer.create({
        sender: alice.partyId,
        recipient: bob.partyId,
        amount: sentValue.toString(),
        instrumentId: 'Amulet',
        registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
    })

await (
    await sdk.ledger.prepare({
        partyId: alice.partyId,
        commands: transferCommand,
        disclosedContracts: transferDisclosedContracts,
    })
)
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info({ sentValue }, 'Executed transfer from Alice to Bob with value:')

const aliceUtxos = await sdk.token.utxos({ partyId: alice.partyId })
const bobUtxos = await sdk.token.utxos({ partyId: bob.partyId })

const partyAmuletValue = (utxos: PrettyContract<Holding>[]) =>
    utxos.reduce(
        (acc, utxo) => acc + parseFloat(utxo.interfaceViewValue.amount),
        0
    )
const aliceAmuletValue = partyAmuletValue(aliceUtxos)
const bobAmuletValue = partyAmuletValue(bobUtxos)

if (aliceAmuletValue !== 8000 || bobAmuletValue !== 2000)
    throw Error(
        `Wrong end results for utxos: ${JSON.stringify({ aliceAmuletValue, bobAmuletValue })}`
    )

logger.info({ aliceAmuletValue, bobAmuletValue }, 'Result:')

// --- TEST CANCEL COMMAND

if (!fetchedPreapprovalStatus?.templateId) {
    throw new Error('No preapproval found - fetchedPreapprovalStatus is null')
}

const fetchACS = async () => {
    logger.info(
        { templateId: fetchedPreapprovalStatus.templateId },
        'Using template ID from fetchedPreapprovalStatus'
    )

    const preapprovalACS = await sdk.ledger.listACS({
        templateIds: [fetchedPreapprovalStatus.templateId],
        parties: [bob.partyId],
    })

    const foundPreapproval = preapprovalACS.find(
        (acs) => acs.contractId === fetchedPreapprovalStatus?.contractId
    )

    const result = { exists: !!foundPreapproval }
    logger.info(result, 'Is preapproval in ACS')

    return result.exists
}

const beforeExists = await fetchACS()

const [cancelPreapprovalCommand, cancelDisclosedContracts] =
    await sdk.amulet.preapproval.command.cancel({
        parties: {
            receiver: bob.partyId,
        },
    })

if (!cancelPreapprovalCommand) {
    throw Error(
        'Cancel preapproval command is null even though one has been created before'
    )
}

await (
    await sdk.ledger.prepare({
        partyId: bob.partyId,
        commands: cancelPreapprovalCommand,
        disclosedContracts: cancelDisclosedContracts,
    })
)
    .sign(bobKeys.privateKey)
    .execute({
        partyId: bob.partyId,
    })

const afterExists = await fetchACS()
if (beforeExists === afterExists || afterExists)
    throw Error('The preapproval still exists in the ACS')
