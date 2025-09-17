import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

await sdk.connect()

const sender = 'sender-party'
const receiver = 'receiver-party'
const instrumentAdminPartyId = 'Admin of the instrument'

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
