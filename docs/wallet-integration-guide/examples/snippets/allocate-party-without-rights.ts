import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    signTransactionHash,
} from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault, // or use your specific configuration
        ledgerFactory: localNetLedgerDefault, // or use your specific configuration
    })
    await sdk.connect()
    await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
    const key = createKeyPair()

    const preparedParty = await sdk.userLedger!.generateExternalParty(
        key.publicKey,
        'my-party'
    )
    const signedHash = signTransactionHash(
        preparedParty.multiHash,
        key.privateKey
    )

    const party = await sdk.userLedger!.allocateExternalParty(
        signedHash,
        preparedParty,
        false //do not grant user actAs and readAs for the party
    )
}
