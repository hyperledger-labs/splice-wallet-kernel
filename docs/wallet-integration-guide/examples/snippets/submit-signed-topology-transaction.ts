import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
} from '@canton-network/wallet-sdk'

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault, // or use your specific configuration
    ledgerFactory: localNetLedgerDefault, // or use your specific configuration
    topologyFactory: localNetTopologyDefault, // or use your specific configuration
})
await sdk.connectTopology()

const preparedParty = {
    partyTransactions: [], // array of topology transactions
    combinedHash: 'the-combined-hash',
    txHashes: [], // the individual transaction hashes
    namespace: 'your-namespace-here',
    partyId: 'your-party-id-here',
}
const signature = 'your-signed-hash-here'

sdk.topology?.submitExternalPartyTopology(signature, preparedParty)
