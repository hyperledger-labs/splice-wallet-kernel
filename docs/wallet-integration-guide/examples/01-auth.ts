import { WalletSDKImpl } from 'splice-sdk-wallet'

const sdk = new WalletSDKImpl()
// .configure({ ledgerBaseUrl: 'https://api.example.com' })

console.log('SDK initialized')
console.log(sdk)

sdk.connect().then((ledger) => {
    console.log('Connected to ledger:', ledger)
    ledger
        .listWallets()
        .then((wallets) => {
            console.log('Wallets:', wallets)
        })
        .catch((error) => {
            console.error('Error listing wallets:', error)
        })
})
