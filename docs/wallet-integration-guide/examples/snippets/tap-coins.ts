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

    const myParty = 'my-party'
    const myPrivateKey = 'private-key-for-my-party'
    const instrumentAdminPartyId = 'Admin of the instrument'

    await sdk.connect()
    await sdk.setPartyId(myParty)

    const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
        myParty,
        '2000000', // how much coins you want
        {
            instrumentId: 'Amulet', //Canton Coin is called Amulet in localNet
            instrumentAdmin: instrumentAdminPartyId,
        }
    )

    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        [{ ExerciseCommand: tapCommand }],
        myPrivateKey,
        v4(),
        disclosedContracts
    )
}
