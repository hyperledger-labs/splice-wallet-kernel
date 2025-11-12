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
    })

    const myParty = global.EXISTING_PARTY_2
    const myPrivateKey = global.EXISTING_PARTY_2_KEYS.privateKey
    const Reject = true

    await sdk.connect()
    await sdk.setPartyId(myParty)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const myPendingTransaction =
        await sdk.tokenStandard!.fetchPendingTransferInstructionView()
    const myPendingTransactionCid = myPendingTransaction[0].contractId
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

        const acceptCommandId =
            await sdk.userLedger?.prepareSignAndExecuteTransaction(
                acceptTransferCommand,
                myPrivateKey,
                v4(),
                disclosedContracts
            )
    }
}
