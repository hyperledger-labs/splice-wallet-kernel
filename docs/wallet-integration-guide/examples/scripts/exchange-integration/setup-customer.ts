import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerAppUser,
    localNetTokenStandardAppUser,
    localNetTopologyAppUser,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

export async function setupCustomer(transferPreapproval: boolean = false) {
    const logger = pino({ name: 'setup-customer', level: 'info' })
    const customerSdk = new WalletSDKImpl().configure({
        logger,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerAppUser,
        topologyFactory: localNetTopologyAppUser,
        tokenStandardFactory: localNetTokenStandardAppUser,
    })

    logger.info(`Setting up customer SDK`)

    await customerSdk.connect()
    await customerSdk.connectAdmin()
    await customerSdk.connectTopology(
        localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
    )
    customerSdk.tokenStandard?.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    const customerKeyPair = createKeyPair()
    const customerParty = (
        await customerSdk.topology?.prepareSignAndSubmitExternalParty(
            customerKeyPair.privateKey,
            'customer'
        )
    )?.partyId!

    logger.info(`Created customer party: ${customerParty}`)
    await customerSdk.setPartyId(customerParty)

    if (transferPreapproval) {
        const instrumentAdminPartyId =
            (await customerSdk.tokenStandard?.getInstrumentAdmin()) || ''

        // using the validator operator party as exchange party
        const validatorOperatorParty =
            await customerSdk.validator!.getValidatorUser()!

        // Setup preapproval
        const cmd =
            await customerSdk.userLedger?.createTransferPreapprovalCommand(
                validatorOperatorParty,
                customerParty,
                instrumentAdminPartyId
            )

        await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
            cmd,
            customerKeyPair.privateKey,
            v4(),
            []
        )
        logger.info(`Created transfer preapproval for: ${customerParty}}`)
    }

    return { customerParty, customerKeyPair, customerSdk }
}
