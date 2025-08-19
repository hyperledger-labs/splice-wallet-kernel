import { WalletSDKImpl } from 'splice-sdk-wallet'

const sdk = new WalletSDKImpl()

console.log(sdk)

sdk.ledger
    .listWallets()
    .then((wallets) => {
        console.log('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })
