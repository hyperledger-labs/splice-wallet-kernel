import {
    localAuthDefault,
    localLedgerDefault,
    WalletSDKImpl,
} from '@splice/sdk-wallet'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    createAuth: () => localAuthDefault(),
    createLedger: localLedgerDefault,
})

console.log('SDK initialized')

sdk.connect().then((ledger) => {
    console.log('Connected to ledger')
    ledger
        .listWallets()
        .then((wallets) => {
            console.log('Wallets:', wallets)
        })
        .catch((error) => {
            console.error('Error listing wallets:', error)
        })
})

sdk.connectAdmin().then((ledger) => {
    console.log('Connected to admin ledger')
    ledger
        .listWallets()
        .then((wallets) => {
            console.log('Wallets:', wallets)
        })
        .catch((error) => {
            console.error('Error listing wallets:', error)
        })
})
