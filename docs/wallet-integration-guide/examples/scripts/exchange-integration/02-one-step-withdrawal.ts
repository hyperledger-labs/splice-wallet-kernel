import { Label, TransferIn } from '@canton-network/core-ledger-client'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { setupExchange } from './setup-exchange.js'
import { setupCustomer } from './setup-customer.js'
import { tapParty } from './tap-party.js'
import {
    validateTransferIn,
    validateTransferOut,
} from './validate-transfers.js'

const logger = pino({ name: '02-one-step-withdrawal', level: 'info' })

const { exchangeParty, treasuryParty, treasuryKeyPair, exchangeSdk } =
    await setupExchange()

const { customerParty, customerKeyPair, customerSdk } =
    await setupCustomer(true)

const instrumentAdminPartyId =
    (await exchangeSdk.tokenStandard?.getInstrumentAdmin()) || ''

const amuletIdentifier = {
    instrumentId: 'Amulet',
    instrumentAdmin: instrumentAdminPartyId,
}

const transferAmount = 100

await tapParty(exchangeSdk, treasuryParty, treasuryKeyPair, transferAmount)

const verifyPreApproval =
    await exchangeSdk.tokenStandard!.getTransferPreApprovalByParty(
        customerParty,
        'Amulet'
    )

if (verifyPreApproval!.expiresAt < new Date(Date.now() + 60 * 1000)) {
    throw new Error(
        `Transfer-preapproval for ${customerParty} expires in less than 60 seconds. expires at: ${verifyPreApproval!.expiresAt}`
    )
}

// Execute transfer withdrawal by customer
const memoUUID = v4()
const [withdrawalTransferCommand, withdrawalTransferDisclosedContracts] =
    await exchangeSdk.tokenStandard!.createTransfer(
        treasuryParty,
        customerParty,
        transferAmount.toString(),
        amuletIdentifier,
        [],
        `${memoUUID}`
    )

await exchangeSdk.userLedger?.prepareSignExecuteAndWaitFor(
    customerTransferCommand,
    treasuryKeyPair.privateKey,
    v4(),
    customerTransferDisclosedContracts
)

logger.info(
    `transferred ${transferAmount} from ${treasuryParty} to ${customerParty}`
)

// customer observes the withdrawal via tx log
const customerHoldings =
    await customerSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferIn(
        customerHoldings!.transactions,
        treasuryParty,
        transferAmount,
        memoUUID,
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`customer found transaction: "${memoUUID}"`)
} else {
    throw new Error(
        `No matching transaction with reason "${memoUUID}" found for customer ${customerParty}`
    )
}

// exchange observes the withdrawal via tx log
const exchangeHoldings =
    await exchangeSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferOut(
        exchangeHoldings!.transactions,
        customerParty,
        transferAmount,
        memoUUID,
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`exchange found transaction: "${memoUUID}"`)
} else {
    throw new Error(
        `No matching transaction with reason "${memoUUID}" found for exchange ${treasuryParty}`
    )
}
