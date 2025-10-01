import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerAppProvider,
    localNetLedgerAppUser,
    localNetTokenStandardAppUser,
    localNetTokenStandardAppProvider,
    localNetTopologyAppProvider,
    localNetTopologyAppUser,
    localValidatorDefault,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

export async function setupCustomer() {
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

    await customerSdk.setPartyId(customerParty)
    logger.info(`Created customer party: ${customerParty}`)

    return { customerParty, customerKeyPair, customerSdk }
}
