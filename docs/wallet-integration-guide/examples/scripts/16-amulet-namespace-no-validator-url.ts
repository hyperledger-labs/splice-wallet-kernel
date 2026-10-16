import type { PrettyContract } from '@canton-network/core-tx-parser'
import type { HoldingView } from '@canton-network/core-token-standard'
import {
    getValidatorParty,
    localNetStaticConfig,
    SDK,
} from '@canton-network/wallet-sdk'
import {
    TOKEN_PROVIDER_CONFIG_DEFAULT,
    AMULET_NAMESPACE_CONFIG_SIMPLE,
    TOKEN_NAMESPACE_CONFIG_SIMPLE,
} from './utils/index.js'

import { configureLogging } from './utils/configure-logging.js'
const logger = await configureLogging()

const sdk = await SDK.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    token: TOKEN_NAMESPACE_CONFIG_SIMPLE,
    amulet: AMULET_NAMESPACE_CONFIG_SIMPLE,
})

const validatorParty = await getValidatorParty(
    localNetStaticConfig.LOCALNET_APP_VALIDATOR_URL,
    TOKEN_PROVIDER_CONFIG_DEFAULT
)

await sdk.amulet.tapInternal('1000', { partyId: validatorParty })

const aliceKeys = sdk.keys.generate()

const alice = await sdk.party.external
    .create(aliceKeys.publicKey, {
        partyHint: 'v1-16-alice',
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
        partyHint: 'v1-16-bob',
    })
    .sign(bobKeys.privateKey)
    .execute()

// --- TEST CREATE COMMAND
let createError: Error | undefined
try {
    const cmd = await sdk.amulet.preapproval.command.create({
        parties: {
            receiver: bob.partyId,
        },
    })
    logger.info(cmd)
} catch (e) {
    createError = e as Error
}
if (createError === undefined) {
    throw new Error(
        `Should not have been able to create the command with the provider party`
    )
}

const createPreapprovalCommand = await sdk.amulet.preapproval.command.create({
    parties: {
        receiver: bob.partyId,
        provider: validatorParty,
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

const start = performance.now()
const fetchOnceStatus = await sdk.amulet.preapproval.fetchQuick(bob.partyId)
const end = performance.now()

const duration = end - start
if (duration < 1000) {
    logger.info(
        `Success! The operation was fast (${duration.toFixed(2)} ms) and fetchOnce status is ${fetchOnceStatus}.`
    )
} else {
    logger.warn(
        `Warning: Operation took longer than 1 second (${(duration / 1000).toFixed(2)} s).`
    )
}

logger.info('Fetching for preapproval status with retry')

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

const partyAmuletValue = (utxos: PrettyContract<HoldingView>[]) =>
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

const start2 = performance.now()
const fetchOnceStatusWithPreapproval = await sdk.amulet.preapproval.fetchQuick(
    bob.partyId
)
const end2 = performance.now()

const duration2 = end2 - start2
if (duration < 1000) {
    logger.info(
        `Success! The operation was fast (${duration2.toFixed(2)} ms) and fetchOnce status is ${fetchOnceStatusWithPreapproval}.`
    )
} else {
    logger.warn(
        `Warning: Operation took longer than 1 second (${duration2.toFixed(2)} s).`
    )
}

const newExpiresAt = new Date(fetchedPreapprovalStatus!.expiresAt)
newExpiresAt.setDate(newExpiresAt.getDate() + 2)

await sdk.amulet.preapproval.renew({
    parties: {
        receiver: bob.partyId,
        provider: validatorParty,
    },
    expiresAt: newExpiresAt,
})

const fetchedStatusAfterRenew = await sdk.amulet.preapproval.fetchStatus(
    bob.partyId,
    {
        oldCid: fetchedPreapprovalStatus!.contractId,
    }
)

const before = fetchedPreapprovalStatus!.expiresAt
const after = fetchedStatusAfterRenew!.expiresAt

if (!(after.getTime() > before.getTime())) {
    throw new Error(
        `Expected expiresAt to increase after renewal. before=${fetchedPreapprovalStatus!.expiresAt.toISOString()} after=${fetchedStatusAfterRenew!.expiresAt.toISOString()}`
    )
}

logger.info(
    {
        before: before.toISOString(),
        after: after.toISOString(),
        extendedSeconds: Math.round(
            (after.getTime() - before.getTime()) / 1000
        ),
    },
    'TransferPreapproval expiry extended, managed to renew preapproval'
)

// --- TEST CANCEL COMMAND
logger.info('Testing out cancel command')

if (!fetchedStatusAfterRenew?.templateId) {
    throw new Error('No preapproval found - fetchedPreapprovalStatus is null')
}
const [cancelPreapprovalCommand, cancelDisclosedContracts] =
    await sdk.amulet.preapproval.command.cancel({
        parties: {
            receiver: bob.partyId,
            provider: validatorParty,
        },
    })

if (!cancelPreapprovalCommand) {
    throw Error(
        'Cancel preapproval command is null even though one has been created before'
    )
}

await sdk.ledger
    .prepare({
        partyId: bob.partyId,
        commands: cancelPreapprovalCommand,
        disclosedContracts: cancelDisclosedContracts,
    })
    .sign(bobKeys.privateKey)
    .execute({
        partyId: bob.partyId,
    })

logger.info('Submitted cancel command; now polling')
const cancelled = await sdk.amulet.preapproval.fetchStatus(bob.partyId, {
    cancelled: true,
})

const preapprovalACS = await sdk.ledger.acsReader.readJsContracts({
    parties: [bob.partyId],
    filterByParty: true,
})

const renewedPreapprovalStillActive = preapprovalACS.some(
    (contract) => contract.contractId === fetchedStatusAfterRenew?.contractId
)

if (cancelled === null && !renewedPreapprovalStillActive) {
    logger.info(`Successfully cancelled`)
}

//member traffic

const [amuletTapCommand2, amuletTapDisclosedContracts2] = await sdk.amulet.tap(
    alice.partyId,
    '2000000'
)

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: amuletTapCommand2,
        disclosedContracts: amuletTapDisclosedContracts2,
    })
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info(`Tapped holdings for alice`)

const trafficStatusBeforePurchase = await sdk.amulet.traffic.status()

logger.info(
    `Traffic status before purchase: ${JSON.stringify(trafficStatusBeforePurchase)}`
)

const ccAmount = 200000

const [buyTrafficCommand, buyTrafficDisclosedContracts] =
    await sdk.amulet.traffic.buy({
        buyer: alice.partyId,
        ccAmount,
        inputUtxos: [],
    })

await sdk.ledger
    .prepare({
        partyId: alice.partyId,
        commands: buyTrafficCommand,
        disclosedContracts: buyTrafficDisclosedContracts,
    })
    .sign(aliceKeys.privateKey)
    .execute({ partyId: alice.partyId })

logger.info(`buy member traffic for sender (${alice.partyId}) party completed`)

const featuredAppRights = await sdk.amulet.featuredApp.grant({
    validatorParty: validatorParty,
})

if (!featuredAppRights) {
    throw new Error(
        'Failed to obtain featured app rights for validator operator party'
    )
} else {
    logger.info(
        featuredAppRights,
        'Featured app rights for validator operator party'
    )
}

const revoked = await sdk.amulet.featuredApp.revoke({
    validatorParty: validatorParty,
})

if (!revoked) {
    throw new Error(
        'Failed to revoke featured app rights for validator operator party'
    )
}

const rightsAfterRevoke = await sdk.amulet.featuredApp.rights({
    partyId: validatorParty,
    maxRetries: 1,
    delayMs: 0,
})

if (rightsAfterRevoke) {
    throw new Error(
        'Featured app rights still present after revoke for validator operator party'
    )
}

logger.info(
    'Successfully revoked featured app rights for validator operator party'
)

// Forcefully exit to prevent floating ledger retries from crashing the event loop
process.exit(0)
