import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

export default async function () {
    await sdk.connect()

    const myParty = 'my-party:22200...'

    // takes an option boolean whether to include locked holdings
    // default is 'true' and in this case utxos locked in a 2-step transfer (awaiting accept or reject)
    // is included in the output
    const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)
}
