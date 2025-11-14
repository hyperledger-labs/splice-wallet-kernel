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

    const myParty = global.EXISTING_PARTY_WITH_PREAPPROVAL

    await sdk.connect()
    await sdk.setPartyId(myParty)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const validatorOperatorParty = await sdk.validator!.getValidatorUser()

    const preapproval =
        await sdk.tokenStandard!.waitForPreapprovalFromScanProxy(
            myParty,
            'Amulet'
        )
    const [renewCmd, disclosedContractsRenew] =
        await sdk.tokenStandard!.createCancelTransferPreapproval(
            preapproval!.contractId,
            preapproval!.templateId,
            validatorOperatorParty!
        )

    //Sign and execute the above command
}
