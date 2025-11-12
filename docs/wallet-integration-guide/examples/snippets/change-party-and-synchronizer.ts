import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })
    await sdk.connect()

    const myParty = global.EXISTING_PARTY_1
    await sdk.setPartyId(myParty)

    const myOtherParty = global.EXISTING_PARTY_2
    await sdk.setPartyId(myOtherParty)
}
