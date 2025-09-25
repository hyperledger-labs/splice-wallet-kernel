import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    await sdk.connect()

    const sender = 'sender-party'
    const receiver = 'receiver-party'
    const instrumentAdminPartyId = 'admin-of-the-instrument'

    const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)

    //let's assume we have 3 utxos of 100,50,25
    const utxosToUse = utxos!.filter((t) => t.interfaceViewValue.amount != '50') //we filter out the 50, since we want to send 125

    //we only want the recipient to have 1 minute to accept
    const expireDate = new Date(Date.now() + 60 * 1000)
    const [transferCommand, disclosedContracts] =
        await sdk.tokenStandard!.createTransfer(
            sender,
            receiver,
            '125',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            },
            utxosToUse.map((t) => t.contractId),
            'memo-ref',
            expireDate
        )
}
