import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '04-token-standard-localnet', level: 'debug' })

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

const keypair = {
    publicKey: 'seqoAQYT5GQZU8x4WOEgp5jad+9nVA8aaRn8G0IOoag=',
    privateKey:
        'oahT1plqyQxgbb27fsy6ix2881d3+aSvSRhaITGftAOx6qgBBhPkZBlTzHhY4SCnmNp372dUDxppGfwbQg6hqA==',
}
const partyId =
    '1220c::1220cc4e539de29867b7afb76a605ae136577da01e52c87f613c4a99d0fe67d88617'
const synchronizerId =
    'global-domain::122098544e6d707a02edee40ff295792b2b526fa30fa7a284a477041eb23d1d26763'

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

sdk.userLedger?.setPartyId(partyId)
sdk.tokenStandard?.setPartyId(partyId)
sdk.tokenStandard?.setSynchronizerId(synchronizerId)

logger.info('List Token Standard Holding Transactions')
await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        logger.info(
            'Token Standard Holding Transactions:',
            JSON.stringify(transactions)
        )
    })
    .catch((error) => {
        console.error(
            'Error listing token standard holding transactions:',
            error
        )
    })

// Node cannot resolve subdomain.localhost, therefore add the following mapping to your /etc/hosts
// 127.0.0.1   scan.localhost
sdk.tokenStandard?.setTransferFactoryRegistryUrl('http://scan.localhost:4000')

// await sdk.tokenStandard?.tap('http://wallet.localhost:2000/api/validator', 1000000)

const createTransfer = await sdk.tokenStandard?.createTransfer(
    partyId,
    'marc::1220ee06a9947d6951889e3458a2e36f0421df008e750fd86187536b3d01bb63363c',
    '100',
    {
        instrumentId: 'Amulet',
        instrumentAdmin:
            'DSO::122098544e6d707a02edee40ff295792b2b526fa30fa7a284a477041eb23d1d26763',
    },
    {}
)

if (!createTransfer) {
    throw new Error('Failed to create transfer command')
}
const [command, disclosedContracts] = createTransfer

console.log('command is: ', command)
sdk.userLedger?.setSynchronizerId(synchronizerId)

const exerciseCommand = {
    ExerciseCommand: command,
}
// const prepared = await sdk.userLedger?.prepareSubmission([exerciseCommand], v4(), disclosedContracts)
// console.log('Prepared command submission for token transfer command', prepared)

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [exerciseCommand],
    keypair.privateKey,
    v4(),
    disclosedContracts
)
