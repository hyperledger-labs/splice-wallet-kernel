import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    const myParty = global.EXISTING_PARTY_1
    const myPrivateKey = global.EXISTING_PARTY_1_KEYS.privateKey
    const instrumentAdminPartyId = global.INSTRUMENT_ADMIN_PARTY

    await sdk.connect()
    await sdk.setPartyId(myParty)
    sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
        myParty,
        '2000000',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        }
    )

    await sdk.userLedger?.prepareSignExecuteAndWaitFor(
        tapCommand,
        myPrivateKey,
        v4(),
        disclosedContracts
    )
}
