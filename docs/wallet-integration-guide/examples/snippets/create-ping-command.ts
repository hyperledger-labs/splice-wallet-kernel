import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@splice/wallet-sdk'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: undefined, //these calls require no topology changes
})

const receiver = 'target-of-ping-recieving-party'

const command = sdk.userLedger?.createPingCommand(receiver)
