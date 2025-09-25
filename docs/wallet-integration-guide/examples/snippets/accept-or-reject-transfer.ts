import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    localNetValidatorDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localNetValidatorDefault,
})

const myParty = 'my-party'
const myPrivateKey = 'private-key-for-my-party'
const myPendingTransactionCid = 'Contract-id-for-a-transfer-instruction'
const Reject = true

await sdk.connect()
await sdk.setPartyId(myParty)

if (Reject) {
    //reject the transaction
    const [rejectTransferCommand, disclosedContracts] =
        await sdk.tokenStandard!.exerciseTransferInstructionChoice(
            myPendingTransactionCid,
            'Reject'
        )

    const rejectCommandId =
        await sdk.userLedger?.prepareSignAndExecuteTransaction(
            rejectTransferCommand,
            myPrivateKey,
            v4(),
            disclosedContracts
        )
} else {
    //accept the transaction
    const [acceptTransferCommand, disclosedContracts] =
        await sdk.tokenStandard!.exerciseTransferInstructionChoice(
            myPendingTransactionCid,
            'Accept'
        )

    const rejectCommandId =
        await sdk.userLedger?.prepareSignAndExecuteTransaction(
            acceptTransferCommand,
            myPrivateKey,
            v4(),
            disclosedContracts
        )
}
