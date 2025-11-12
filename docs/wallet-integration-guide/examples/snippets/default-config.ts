import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    localValidatorDefault,
} from '@canton-network/wallet-sdk'

export default async function () {
    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    return new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: localNetLedgerDefault,
        topologyFactory: localNetTopologyDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
        validatorFactory: localValidatorDefault,
    })
}
