import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
    localValidatorDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
        validatorFactory: localValidatorDefault,
    })

    const myParty = global.EXISTING_PARTY_1
    const myPrivateKey = global.EXISTING_PARTY_1_KEYS.privateKey

    await sdk.connect()
    await sdk.setPartyId(myParty)
    sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const myPendingTransaction =
        await sdk.tokenStandard!.fetchPendingTransferInstructionView()
    const myPendingTransactionCid = myPendingTransaction[0].contractId

    //withdraw the transaction
    const [withdrawTransferCommand, disclosedContracts] =
        await sdk.tokenStandard!.exerciseTransferInstructionChoice(
            myPendingTransactionCid,
            'Withdraw'
        )

    const withdrawCommandId =
        await sdk.userLedger?.prepareSignAndExecuteTransaction(
            withdrawTransferCommand,
            myPrivateKey,
            v4(),
            disclosedContracts
        )
}
