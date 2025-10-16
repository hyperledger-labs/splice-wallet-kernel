import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetStaticConfig,
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

    const signedHash = 'my-signed-hash'
    const preparedParty = {
        partyId: 'party-id',
        publicKeyFingerprint: 'finger-print',
        topologyTransactions: [],
        multiHash: 'multi-hash',
    }
    const party = await sdk.userLedger?.allocateExternalParty(
        signedHash,
        preparedParty,
        false //do not grant user actAs and readAs for the party
    )

    return party?.partyId
}
