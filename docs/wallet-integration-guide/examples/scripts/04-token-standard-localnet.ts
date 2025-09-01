import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '04-token-standard-localnet', level: 'info' })

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

const keyPair = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology()

const party = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPair.privateKey,
    'alice'
)

logger.info('created party: ' + party!.partyId)
sdk.userLedger?.setPartyId(party!.partyId)
sdk.tokenStandard?.setPartyId(party!.partyId)

const synchronizers = await sdk.userLedger?.listSynchronizers()

// @ts-ignore
const synchonizerId = synchronizers!.connectedSynchronizers[0].synchronizerId

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets:')
    })
    .catch((error) => {
        logger.error({ error }, 'Error listing wallets')
    })

sdk.tokenStandard?.setSynchronizerId(synchonizerId)

// Node cannot resolve subdomain.localhost, therefore add the following mapping to your /etc/hosts
// 127.0.0.1   scan.localhost
sdk.tokenStandard?.setTransferFactoryRegistryUrl('http://scan.localhost:4000')

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    party!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin:
            'DSO::122098544e6d707a02edee40ff295792b2b526fa30fa7a284a477041eb23d1d26763',
    }
)

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: tapCommand }],
    keyPair.privateKey,
    v4(),
    disclosedContracts
)

await new Promise((res) => setTimeout(res, 5000))

logger.info('List Token Standard Holding Transactions')

await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        logger.info(transactions, 'Token Standard Holding Transactions:')
    })
    .catch((error) => {
        logger.error(
            { error },
            'Error listing token standard holding transactions:'
        )
    })

logger.info('Creating transfer transaction')

const [transferCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        party!.partyId,
        'marc::1220ee06a9947d6951889e3458a2e36f0421df008e750fd86187536b3d01bb63363c',
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin:
                'DSO::122098544e6d707a02edee40ff295792b2b526fa30fa7a284a477041eb23d1d26763',
        },
        {}
    )

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: transferCommand }],
    keyPair.privateKey,
    v4(),
    disclosedContracts2
)

logger.info('Submitted transfer transaction')
