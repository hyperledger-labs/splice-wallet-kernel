import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })
    await sdk.connect()
    await sdk.setPartyId('source-of-ping-party', 'global-synchronizer-id')

    const receiver = 'target-of-ping-party'

    return sdk.userLedger?.createPingCommand(receiver)
}
