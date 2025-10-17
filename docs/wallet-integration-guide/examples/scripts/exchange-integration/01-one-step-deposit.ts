import { Label, TransferIn } from '@canton-network/core-ledger-client'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { setupExchange } from './setup-exchange.js'
import { setupDemoCustomer } from './setup-demo-customer.js'
import { tapDevNetFaucet } from './tap-devnet-faucet.js'
import { validateTransferIn } from './validate-transfers.js'

const logger = pino({ name: '01-one-step-deposit', level: 'info' })

const { treasuryParty, exchangeSdk } = await setupExchange({
    transferPreapproval: true,
    grantFeatureAppRights: true,
})

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

// exchange observes the deposit via tx log
const exchangeHoldings =
    await exchangeSdk.tokenStandard?.listHoldingTransactions()

if (
    validateTransferIn(
        exchangeHoldings!.transactions,
        customerParty,
        transferAmount,
        depositUUID,
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
