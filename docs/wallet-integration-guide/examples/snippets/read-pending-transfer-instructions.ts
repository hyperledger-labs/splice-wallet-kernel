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
    await sdk.setPartyId(myParty)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    //this returns a list of all transfer instructions, you can then accept or reject them
    const pendingInstructions =
        await sdk.tokenStandard!.fetchPendingTransferInstructionView()
}
