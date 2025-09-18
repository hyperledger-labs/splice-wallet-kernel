import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })

    await sdk.connect()

    return await sdk.userLedger?.listWallets()
}
