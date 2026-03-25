import { Holding, PrettyContract } from '@canton-network/core-tx-parser'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { TransactionFilterBySetup } from '@canton-network/core-ledger-client-types'
import { pino } from 'pino'
import { TOKEN_PROVIDER_CONFIG_DEFAULT } from './utils/index.js'

const logger = pino({ name: 'v1-05-preapproval', level: 'info' })

const sdk = await Sdk.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
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

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: amuletTapCommand,
        disclosedContracts: amuletTapDisclosedContracts,
    })
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

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: createPreapprovalCommand,
    })
    .sign(bobKeys.privateKey)
    .execute({
        partyId: bob.partyId,
    })

logger.info('Successfully registered the preapproval.')

// --- TEST FETCH

logger.info(
    "Fetching for preapproval status. This might take up to 5 minutes... Why don't you go make some coffee?"
)

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

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: transferCommand,
        disclosedContracts: transferDisclosedContracts,
    })
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info({ sentValue }, 'Executed transfer from Alice to Bob with value:')

const aliceUtxos = await sdk.token.utxos.list({ partyId: alice.partyId })
const bobUtxos = await sdk.token.utxos.list({ partyId: bob.partyId })

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

// --- TEST RENEW COMMAND

logger.info('Renewing preapproval...')

const newExpiresAt = new Date(fetchedPreapprovalStatus!.expiresAt)
newExpiresAt.setDate(newExpiresAt.getDate() + 2)

await sdk.amulet.preapproval.renew({
    parties: {
        receiver: bob.partyId,
    },
    expiresAt: newExpiresAt,
})

const fetchedStatusAfterRenew = await sdk.amulet.preapproval.fetchStatus(
    bob.partyId
)

if (fetchedPreapprovalStatus?.expiresAt === fetchedStatusAfterRenew?.expiresAt)
    throw Error("The expiration date hasn't changed")

logger.info(
    fetchedStatusAfterRenew,
    'Successfully managed to renew preapproval'
)

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
        body: {
            filter: TransactionFilterBySetup({
                partyId: bob.partyId,
                templateIds: [fetchedPreapprovalStatus.templateId],
            }),
            eventFormat: {},
        },
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
