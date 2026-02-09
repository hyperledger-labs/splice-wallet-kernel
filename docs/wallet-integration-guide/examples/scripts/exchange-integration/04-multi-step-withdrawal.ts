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

const logger = pino({ name: '04-multi-step-withdrawal', level: 'info' })

const { treasuryParty, treasuryKeyPair, exchangeSdk } = await setupExchange()

const { customerParty, customerKeyPair, customerSdk } =
    await setupDemoCustomer()

const instrumentAdminPartyId =
    (await exchangeSdk.tokenStandard?.getInstrumentAdmin()) || ''

const amuletIdentifier = {
    instrumentId: 'Amulet',
    instrumentAdmin: instrumentAdminPartyId,
}

const transferAmount = 100

await tapDevNetFaucet(
    exchangeSdk,
    treasuryParty,
    treasuryKeyPair,
    transferAmount
)

// Execute transfer withdrawal by customer
const withdrawalUUID = v4()
const [withdrawalTransferCommand, withdrawalTransferDisclosedContracts] =
    await exchangeSdk.tokenStandard!.createTransfer(
        treasuryParty,
        customerParty,
        transferAmount.toString(),
        amuletIdentifier,
        [],
        `${withdrawalUUID}`
    )

await exchangeSdk.userLedger?.prepareSignExecuteAndWaitFor(
    withdrawalTransferCommand,
    treasuryKeyPair.privateKey,
    v4(),
    withdrawalTransferDisclosedContracts
)

logger.info(
    `transferred ${transferAmount} from ${treasuryParty} to ${customerParty}`
)

//customer finds the pending offer and accepts it
const pendingOffers =
    await customerSdk.tokenStandard?.fetchPendingTransferInstructionView()

if (pendingOffers?.length !== 1) {
    throw new Error(
        `Expected exactly one pending transfer instruction, but found ${pendingOffers?.length}`
    )
} else {
    const pendingOffer = pendingOffers[0]
    const [acceptTransferCommand, disclosedContracts] =
        await customerSdk.tokenStandard!.exerciseTransferInstructionChoice(
            pendingOffer.contractId,
            'Accept'
        )

    await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
        acceptTransferCommand,
        customerKeyPair.privateKey,
        v4(),
        disclosedContracts
    )

    logger.info(
        `customer found and accepted pending offer for ${pendingOffer.contractId}`
    )
}

// customer observes the withdrawal via tx log
const customerHoldings =
    await customerSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferIn(
        customerHoldings!.transactions,
        treasuryParty,
        transferAmount,
        undefined, //TODO: change to memoUUID once relevant bug is fixed
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`customer found transaction: "${withdrawalUUID}"`)
} else {
    throw new Error(
        `No matching transaction with reason "${withdrawalUUID}" found for customer ${customerParty}`
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
        undefined, //TODO: change to memoUUID once relevant bug is fixed
        amuletIdentifier.instrumentId,
        amuletIdentifier.instrumentAdmin
    )
) {
    logger.info(`exchange found transaction: "${withdrawalUUID}"`)
} else {
    throw new Error(
        `No matching transaction with reason "${withdrawalUUID}" found for exchange ${treasuryParty}`
    )
}
