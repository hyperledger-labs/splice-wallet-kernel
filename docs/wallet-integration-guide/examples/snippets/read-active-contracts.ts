import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
    })
    await sdk.connect()

    const offset = 100 // you can use the sdk.userLedger.ledgerEnd() to get the latest offset

    const allActiveContracts = await sdk.userLedger?.activeContracts({ offset })

    const myTemplateId = 'your-template-id-here'

    return await sdk.userLedger?.activeContracts({
        offset,
        templateIds: [myTemplateId], //this is optional for if you want to filter by template id
    })
}
