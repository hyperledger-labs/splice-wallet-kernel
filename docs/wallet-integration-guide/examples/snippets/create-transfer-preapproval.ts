import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    localValidatorDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localValidatorDefault,
})

const myParty = 'my-party'
const myPrivateKey = 'private-key-for-my-party'

await sdk.connect()
await sdk.setPartyId(myParty)
const validatorOperatorParty = await sdk.validator?.getValidatorUser()

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

await new Promise((res) => setTimeout(res, 5000))

const transferPreApprovalProposal =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        validatorOperatorParty!, //operator party
        myParty, //party to auto accept for
        instrumentAdminPartyId //admin of the instrument
    )

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [transferPreApprovalProposal],
    myPrivateKey,
    v4()
)
