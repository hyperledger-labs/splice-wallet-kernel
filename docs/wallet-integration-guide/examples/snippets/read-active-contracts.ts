import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
} from '@splice/wallet-sdk'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
})
await sdk.connect()

const offset = 100 // you can use the sdk.userLedger.ledgerEnd() to get the latest offset

const allActiveContracts = await sdk.userLedger?.activeContracts({ offset })

const myTemplateId = 'your-template-id-here'

const allActiveContractOfMyTemplate = await sdk.userLedger?.activeContracts({
    offset,
    templateIds: [myTemplateId], //this is optional for if you want to filter by template id
})
