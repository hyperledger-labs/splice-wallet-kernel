import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    signTransactionHash,
} from '@splice/wallet-sdk'
import { v4 } from 'uuid'

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

console.log('SDK initialized')

await sdk.connect()
console.log('Connected to ledger')

const keypair = {
    publicKey: 'seqoAQYT5GQZU8x4WOEgp5jad+9nVA8aaRn8G0IOoag=',
    privateKey:
        'oahT1plqyQxgbb27fsy6ix2881d3+aSvSRhaITGftAOx6qgBBhPkZBlTzHhY4SCnmNp372dUDxppGfwbQg6hqA==',
}
const partyId =
    '1220c::1220cc4e539de29867b7afb76a605ae136577da01e52c87f613c4a99d0fe67d8861'
const synchronizerId =
    'global-domain::122098544e6d707a02edee40ff295792b2b526fa30fa7a284a477041eb23d1d26763'

console.log('SDK initialized')

await sdk.connect()
console.log('Connected to ledger')

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        console.log('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectAdmin()
console.log('Connected to admin ledger')

await sdk.adminLedger
    ?.listWallets()
    .then((wallets) => {
        console.log('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectTopology()
console.log('Connected to topology')

sdk.userLedger?.setPartyId(partyId)
sdk.adminLedger?.setPartyId(partyId)
sdk.tokenStandard?.setPartyId(partyId)
sdk.tokenStandard?.setSynchronizerId(synchronizerId)

console.log('List Token Standard Holding Transactions')
await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        console.log('Token Standard Holding Transactions:', transactions)
    })
    .catch((error) => {
        console.error(
            'Error listing token standard holding transactions:',
            error
        )
    })
