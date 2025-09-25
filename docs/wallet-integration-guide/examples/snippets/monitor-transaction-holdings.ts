import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    export default async function () {
        let startLedger = '0'
        let step = '100'

        while (true) {
            const holdings = await sdk.tokenStandard?.listHoldingTransactions(
                startLedger,
                step
            )

            //we update our offsets so we fetch for the next 100 ledger transactions
            startLedger = holdings!.nextOffset.toString()
            step = (Number(startLedger) + 100).toString()

            console.log(!holdings!.transactions)

            //sleep for 5 seconds
            await new Promise((res) => setTimeout(res, 5000))
        }
    }
}
