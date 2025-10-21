import {
    WalletSDKImpl,
    LedgerController,
    TopologyController,
    ValidatorController,
    AuthTokenProvider,
    localNetAuthDefault,
} from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const myLedgerFactory = (
        userId: string,
        authTokenProvider: AuthTokenProvider
    ) => {
        return new LedgerController(
            userId,
            new URL('http://my-json-ledger-api'),
            false,
            authTokenProvider
        )
    }
    const myTopologyFactory = (
        userId: string,
        authTokenProvider: AuthTokenProvider,
        synchronizerId: string
    ) => {
        return new TopologyController(
            'my-grpc-admin-api',
            new URL('http://my-json-ledger-api'),
            userId,
            authTokenProvider,
            synchronizerId
        )
    }
    const myValidatorFactory = (
        userId: string,
        authTokenProvider: AuthTokenProvider
    ) => {
        return new ValidatorController(
            userId,
            new URL('http://my-validator-app-api'),
            authTokenProvider
        )
    }
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: myLedgerFactory,
        topologyFactory: myTopologyFactory,
        validatorFactory: myValidatorFactory,
    })
    await sdk.connect()
    await sdk.connectAdmin()
    //an alternative here is the use the synchronizer directly like
    //await sdk.connectTopology('global-domain::22200...')
    await sdk.connectTopology(new URL('http://my-scan-proxy-api'))
}
