import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@splice/sdk-wallet'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: undefined, //these calls require no topology changes
})

sdk.userLedger.setPartyId('my-wallet-1')
sdk.userLedger.setSynchronizerId('synchronizer-1')
