import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault, // or use your specific configuration
        ledgerFactory: localNetLedgerDefault, // or use your specific configuration
        topologyFactory: localNetTopologyDefault, // or use your specific configuration
    })
    await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

    const preparedParty = {
        transactions: [], // array of topology transactions
        multiHash: 'the-combined-hash',
        publicKeyFingerprint: 'your-namespace-here',
        partyId: 'your-party-id-here',
    }
    const signature = 'your-signed-hash-here'

    return sdk.userLedger?.allocateExternalParty(signature, preparedParty)
}
