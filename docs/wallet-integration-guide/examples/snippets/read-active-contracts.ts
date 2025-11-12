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
    const offset = (await sdk.userLedger!.ledgerEnd()!).offset
    //we use holdings as an example here
    const myTemplateId = '#AdminWorkflows:Canton.Internal.Ping:Ping'

    return await sdk.userLedger!.activeContracts({
        offset,
        parties: [myParty],
        templateIds: [myTemplateId], //this is optional for if you want to filter by template id
        filterByParty: true,
    })
}
