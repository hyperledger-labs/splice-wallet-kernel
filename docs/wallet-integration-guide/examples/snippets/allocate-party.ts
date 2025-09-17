import {
    WalletSDKImpl,
    createKeyPair,
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
    await sdk.connectTopology(LOCALNET_SCAN_API_URL)

    const key = createKeyPair()

    // partyHint is optional but recommended to make it easier to identify the party
    const partyHint = 'my-wallet-1'

    const party = await sdk.topology?.prepareSignAndSubmitExternalParty(
        key.privateKey,
        partyHint
    )

    return party
}
