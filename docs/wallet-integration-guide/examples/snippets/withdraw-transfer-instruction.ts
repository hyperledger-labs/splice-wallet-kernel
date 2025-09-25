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

await sdk.connect()
await sdk.setPartyId(myParty)

//withdraw the transaction
const [withdrawTransferCommand, disclosedContracts] =
    await sdk.tokenStandard!.exerciseTransferInstructionChoice(
        myPendingTransactionCid,
        'withdraw'
    )

const withdrawCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        withdrawTransferCommand,
        myPrivateKey,
        v4(),
        disclosedContracts
    )
