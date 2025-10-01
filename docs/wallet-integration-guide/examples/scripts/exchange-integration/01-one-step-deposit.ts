import { Label, TransferIn } from '@canton-network/core-ledger-client'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { setupExchange } from './setup-exchange.js'
import { setupCustomer } from './setup-customer.js'
import { tapParty } from './tap-party.js'
import { validateTransferIn } from './validate-transfers.js'

const logger = pino({ name: '01-one-step-deposit', level: 'info' })

const { exchangeParty, treasuryParty, exchangeSdk } = await setupExchange(true)

const { customerParty, customerKeyPair, customerSdk } = await setupCustomer()

await tapParty(customerSdk, customerParty, customerKeyPair, 100)

const instrumentAdminPartyId =
    (await exchangeSdk.tokenStandard?.getInstrumentAdmin()) || ''

const transferAmount = 100
const amuletIdentifier = {
    instrumentId: 'Amulet',
    instrumentAdmin: instrumentAdminPartyId,
}

// transfer to exchange
const exchangeLedgerEnd = await exchangeSdk.userLedger?.ledgerEnd()
const memoUUID = v4()
const [customerTransferCommand, customerTransferDisclosedContracts] =
    await customerSdk.tokenStandard!.createTransfer(
        customerParty,
        treasuryParty,
        transferAmount.toString(),
        amuletIdentifier,
        [],
        `${memoUUID}`
    )

await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
    customerTransferCommand,
    customerKeyPair.privateKey,
    memoUUID,
    customerTransferDisclosedContracts
)

logger.info(
    `transferred ${transferAmount} from ${customerParty} to ${treasuryParty}`
)

// the exchange ledger waits for seeing the command completion
await exchangeSdk.userLedger?.waitForCompletion(
    exchangeLedgerEnd,
    30000,
    memoUUID
)

// exchange observes the deposit via tx log
const exchangeHoldings =
    await exchangeSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferIn(
        exchangeHoldings!.transactions,
        customerParty,
        transferAmount,
        memoUUID,
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`Found a matching transaction with reason "${memoUUID}"`)
} else {
    throw new Error(`No matching transaction with reason "${memoUUID}" found`)
}
