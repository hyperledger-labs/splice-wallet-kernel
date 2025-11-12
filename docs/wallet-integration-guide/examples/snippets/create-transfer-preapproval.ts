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
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

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
}
