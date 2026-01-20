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

    await sdk.connect()
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )
    await sdk.setPartyId(myParty)

    let startLedger = 0
    let step = 10

    const holdings = await sdk.tokenStandard!.listHoldingTransactions(
        startLedger,
        step
    )

    //increment steps to get more holdings if there are more
}
