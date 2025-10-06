import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerAppProvider,
    localNetTokenStandardAppProvider,
    localNetTopologyAppProvider,
    localValidatorDefault,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

//this follows the steps of https://docs.digitalasset.com/integrate/devnet/exchange-integration/node-operations.html#setup-exchange-parties
export async function setupExchange(options?: {
    transferPreapproval?: boolean
    grantFeatureAppRights?: boolean
}) {
    const logger = pino({ name: 'setup-exchange', level: 'info' })

    const exchangeSdk = new WalletSDKImpl().configure({
        logger,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerAppProvider,
        topologyFactory: localNetTopologyAppProvider,
        tokenStandardFactory: localNetTokenStandardAppProvider,
        validatorFactory: localValidatorDefault,
    })

    logger.info('Setup exchange SDK')

    await exchangeSdk.connect()
    await exchangeSdk.connectAdmin()
    await exchangeSdk.connectTopology(
        localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
    )
    exchangeSdk.tokenStandard?.setTransferFactoryRegistryUrl(
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )

    logger.info('Connected to ledger & topology')

    // Setup the treasury party
    const treasuryKeyPair = createKeyPair()
    const treasuryParty = (
        await exchangeSdk.topology?.prepareSignAndSubmitExternalParty(
            treasuryKeyPair.privateKey,
            'treasury'
        )
    )?.partyId!

    logger.info(`Created treasury party: ${treasuryParty}`)

    await exchangeSdk.setPartyId(treasuryParty)

    // using the validator operator party as exchange party
    const exchangeParty = await exchangeSdk.validator!.getValidatorUser()!

    if (options?.transferPreapproval) {
        const instrumentAdminPartyId =
            (await exchangeSdk.tokenStandard?.getInstrumentAdmin()) || ''

        await exchangeSdk.tokenStandard?.createTapInternal(
            exchangeParty,
            '20000000',
            {
                instrumentId: 'Amulet',
                instrumentAdmin: instrumentAdminPartyId,
            }
        )

        // Setup preapproval
        const cmd =
            await exchangeSdk.userLedger?.createTransferPreapprovalCommand(
                exchangeParty,
                treasuryParty,
                instrumentAdminPartyId
            )

        await exchangeSdk.userLedger?.prepareSignExecuteAndWaitFor(
            cmd,
            treasuryKeyPair.privateKey,
            v4(),
            []
        )

        logger.info(`Created transfer preapproval for: ${treasuryParty}`)
    }

    if (options?.grantFeatureAppRights) {
        await exchangeSdk.setPartyId(exchangeParty)

        const exchangePartyFeaturedAppRights =
            await exchangeSdk.tokenStandard!.grantFeatureAppRightsForInternalParty()

        logger.info(`Featured App Rights for validator ${exchangeParty}`)
        await exchangeSdk.setPartyId(treasuryParty)
    }
    return { exchangeParty, treasuryParty, treasuryKeyPair, exchangeSdk }
}
