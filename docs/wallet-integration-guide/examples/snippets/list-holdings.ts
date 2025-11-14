import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    const myParty = global.EXISTING_PARTY_1

    await sdk.connect()
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )
    await sdk.setPartyId(myParty)

    // takes an option boolean whether to include locked holdings
    // default is 'true' and in this case utxos locked in a 2-step transfer (awaiting accept or reject)
    // is included in the output
    const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)
}
