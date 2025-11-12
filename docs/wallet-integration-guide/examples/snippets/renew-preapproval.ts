import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetStaticConfig,
    localNetTokenStandardDefault,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })

    const myParty = global.EXISTING_PARTY_WITH_PREAPPROVAL
    const validatorOperatorParty = global.VALIDATOR_OPERATOR_PARTY

    await sdk.connect()
    await sdk.setPartyId(myParty)
    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    //Fetch the existing preapproval
    const preapproval =
        await sdk.tokenStandard!.waitForPreapprovalFromScanProxy(
            myParty,
            'Amulet'
        )
    const [renewCmd, disclosedContractsRenew] =
        await sdk.tokenStandard!.createRenewTransferPreapproval(
            preapproval!.contractId,
            preapproval!.templateId,
            validatorOperatorParty!
        )

    //Sign and execute the above command
}
