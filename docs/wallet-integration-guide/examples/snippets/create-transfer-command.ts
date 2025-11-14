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

    await sdk.connect()
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const sender = global.EXISTING_PARTY_1
    const receiver = global.EXISTING_PARTY_2
    const instrumentAdminPartyId = global.INSTRUMENT_ADMIN_PARTY

    const [transferCommand, disclosedContracts] =
        await sdk.tokenStandard!.createTransfer(
            sender,
            receiver,
            '100',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            [],
            'memo-ref'
        )
}
