import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@splice/wallet-sdk'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
})
await sdk.connect()

sdk.userLedger?.setPartyId('my-wallet-1')
sdk.userLedger?.setSynchronizerId('synchronizer-1')
