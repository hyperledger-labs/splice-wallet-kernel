import { Label, TransferIn } from '@canton-network/core-tx-parser'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { setupExchange } from './setup-exchange.js'
import { setupDemoCustomer } from './setup-demo-customer.js'
import { tapDevNetFaucet } from './tap-devnet-faucet.js'
import {
    validateTransferIn,
    validateTransferOut,
} from './validate-transfers.js'

const logger = pino({ name: '03-multi-stepdeposit', level: 'info' })

const { treasuryParty, treasuryKeyPair, exchangeSdk } = await setupExchange()

const { customerParty, customerKeyPair, customerSdk } =
    await setupDemoCustomer()

await tapDevNetFaucet(customerSdk, customerParty, customerKeyPair, 100)

const instrumentAdminPartyId =
    (await exchangeSdk.tokenStandard?.getInstrumentAdmin()) || ''

const transferAmount = 100
const amuletIdentifier = {
    instrumentId: 'Amulet',
    instrumentAdmin: instrumentAdminPartyId,
}

// transfer to exchange
const depositUUID = v4()
const [customerTransferCommand, customerTransferDisclosedContracts] =
    await customerSdk.tokenStandard!.createTransfer(
        customerParty,
        treasuryParty,
        transferAmount.toString(),
        amuletIdentifier,
        [],
        `${depositUUID}`
    )

await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
    customerTransferCommand,
    customerKeyPair.privateKey,
    depositUUID,
    customerTransferDisclosedContracts
)

logger.info(
    `Instructed transfer of ${transferAmount} from ${customerParty} to ${treasuryParty}`
)

//exchange finds the pending offer and accepts it
const pendingOffers =
    await exchangeSdk.tokenStandard?.fetchPendingTransferInstructionView()

if (pendingOffers?.length !== 1) {
    throw new Error(
        `Expected exactly one pending transfer instruction, but found ${pendingOffers?.length}`
    )
} else {
    const pendingOffer = pendingOffers[0]
    const [acceptTransferCommand, disclosedContracts] =
        await exchangeSdk.tokenStandard!.exerciseTransferInstructionChoice(
            pendingOffer.contractId,
            'Accept'
        )

    await exchangeSdk.userLedger?.prepareSignExecuteAndWaitFor(
        acceptTransferCommand,
        treasuryKeyPair.privateKey,
        v4(),
        disclosedContracts
    )

    logger.info(
        `exchange found and accepted pending offer for ${pendingOffer.contractId}`
    )
}

// exchange observes the deposit via tx log
const exchangeHoldings =
    await exchangeSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferIn(
        exchangeHoldings!.transactions,
        customerParty,
        transferAmount,
        undefined, //TODO: change to memoUUID once relevant bug is fixed
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`Found a matching transaction with reason "${depositUUID}"`)
} else {
    logger.error(exchangeHoldings, 'exchange holdings')
    throw new Error(
        `No matching transaction with reason "${depositUUID}" found`
    )
}

// customer observes the withdrawal via tx log
const customerHoldings =
    await customerSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferOut(
        customerHoldings!.transactions,
        treasuryParty,
        transferAmount,
        undefined, //TODO: change to memoUUID once relevant bug is fixed
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`customer found transaction: "${depositUUID}"`)
} else {
    logger.error(customerHoldings, 'customer holdings')
    throw new Error(
        `No matching transaction with reason "${depositUUID}" found for customer ${customerParty}`
    )
}
