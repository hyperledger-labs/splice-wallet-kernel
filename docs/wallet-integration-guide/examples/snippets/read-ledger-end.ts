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

const ledgerEnd = await sdk.userLedger?.ledgerEnd()
