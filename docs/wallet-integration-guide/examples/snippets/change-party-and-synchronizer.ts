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

    await sdk.setPartyId('my-wallet-1')
}
