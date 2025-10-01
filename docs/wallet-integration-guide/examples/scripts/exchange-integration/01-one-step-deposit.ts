import { Label, TransferIn } from '@canton-network/core-ledger-client'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { setupExchange } from './setup-exchange.js'
import { setupCustomer } from './setup-customer.js'

const logger = pino({ name: '08-one-step-deposit', level: 'info' })

const { exchangeParty, treasuryParty, exchangeSdk } = await setupExchange()

const { customerParty, customerKeyPair, customerSdk } = await setupCustomer()

const instrumentAdminPartyId =
    (await exchangeSdk.tokenStandard?.getInstrumentAdmin()) || ''

const amuletIdentifier = {
    instrumentId: 'Amulet',
    instrumentAdmin: instrumentAdminPartyId,
}
const [tapCommand, tapDisclosedContracts] =
    await customerSdk.tokenStandard!.createTap(
        customerParty,
        '100',
        amuletIdentifier
    )

await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    customerKeyPair.privateKey,
    v4(),
    tapDisclosedContracts
)

logger.info(`Tapped for ${customerParty}`)

// transfer to exchange
const memoUUID = v4()
const [customerTransferCommand, customerTransferDisclosedContracts] =
    await customerSdk.tokenStandard!.createTransfer(
        customerParty,
        treasuryParty,
        '100',
        amuletIdentifier,
        [],
        `${memoUUID}`
    )

await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
    customerTransferCommand,
    customerKeyPair.privateKey,
    v4(),
    customerTransferDisclosedContracts
)

logger.info(`transferred 100 from ${customerParty} to ${treasuryParty}`)

// exchange observes the deposit via tx log
const exchangeHoldings =
    await exchangeSdk.tokenStandard?.listHoldingTransactions()

// Type guard for TransferIn
function isTransferIn(label: Label): label is TransferIn {
    return (
        label.type === 'TransferIn' && typeof (label as any).sender === 'string'
    )
}

const isCustomerTransfer = exchangeHoldings!.transactions.some((tx) =>
    tx.events.some(
        (event) =>
            isTransferIn(event.label) &&
            (event.label as TransferIn).reason === `${memoUUID}` &&
            (event.label as TransferIn).sender === customerParty &&
            event.unlockedHoldingsChange.creates.some(
                (holding) =>
                    Number(holding.amount) === 100 &&
                    holding.instrumentId.admin ===
                        amuletIdentifier.instrumentAdmin &&
                    holding.instrumentId.id === amuletIdentifier.instrumentId
            )
    )
)

if (isCustomerTransfer) {
    logger.info(`Found a matching transaction with reason "${memoUUID}"`)
} else {
    throw new Error(`No matching transaction with reason "${memoUUID}" found`)
}
