import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    localValidatorDefault,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'

// @disable-snapshot-test
export default async function () {
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
        validatorFactory: localValidatorDefault,
    })

    const myParty = 'my-party'

    await sdk.connect()
    await sdk.setPartyId(myParty)
    const validatorOperatorParty = await sdk.validator?.getValidatorUser()

    const preapproval =
        await sdk.tokenStandard!.waitForPreapprovalFromScanProxy(
            myParty,
            'Amulet'
        )
    const [renewCmd, disclosedContractsRenew] =
        await sdk.tokenStandard!.createRenewTransferPreapproval(
            preapproval.contractId,
            preapproval.templateId,
            validatorOperatorParty!
        )

    //Sign and execute the above command
}
