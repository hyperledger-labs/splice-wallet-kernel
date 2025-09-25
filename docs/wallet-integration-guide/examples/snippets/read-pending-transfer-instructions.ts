import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    localNetValidatorDefault,
} from '@canton-network/wallet-sdk'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localNetValidatorDefault,
})

const myParty = 'my-party'

await sdk.connect()
await sdk.setPartyId(myParty)

//this returns a list of all transfer instructions, you can then accept or reject them
const pendingInstructions =
    await sdk.tokenStandard?.fetchPendingTransferInstructionView()
