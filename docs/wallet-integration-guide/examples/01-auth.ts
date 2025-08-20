import { WalletSDKImpl } from 'splice-sdk-wallet'
import { localAuthDefault } from 'splice-sdk-wallet/dist/authController.js'
import { localLedgerDefault } from 'splice-sdk-wallet/dist/ledgerController.js'

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
