import {
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTopologyDefault,
    TopologyController,
    WalletSDKImpl,
    LedgerController,
} from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault, // or use your specific configuration
        ledgerFactory: localNetLedgerDefault, // or use your specific configuration
        topologyFactory: localNetTopologyDefault, // or use your specific configuration
    })

    await sdk.connect()
    await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

    const { publicKey, privateKey } = TopologyController.createNewKeyPair()
    //partyHint is optional but recommended to make it easier to identify the party
    const partyHint = 'my-wallet-1'

    const generateExternalPartyResponse =
        await sdk.userLedger?.generateExternalParty(publicKey, partyHint)

    return generateExternalPartyResponse!.topologyTransactions!.map(
        (topologyTx) =>
            LedgerController.toDecodedTopologyTransaction(topologyTx)
    )
}
