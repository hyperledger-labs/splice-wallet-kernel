import {
    WalletSDKImpl,
    LedgerController,
    TopologyController,
    ValidatorController,
    TokenStandardController,
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
            undefined,
            false,
            authTokenProvider
        )
    }
    // topology controller is deprecated in favor of using ledgerController
    // it is stil supported however for backwards compatibility

    // const myTopologyFactory = (
    //     userId: string,
    //     authTokenProvider: AuthTokenProvider,
    //     synchronizerId: string
    // ) => {
    //     return new TopologyController(
    //         'my-grpc-admin-api',
    //         new URL('http://my-json-ledger-api'),
    //         userId,
    //         synchronizerId,
    //         undefined,
    //         authTokenProvider
    //     )
    // }
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

    const myTokenStandardFactory = (
        userId: string,
        authTokenProvider: AuthTokenProvider
    ) => {
        return new TokenStandardController(
            userId,
            new URL('http://my-json-ledger-api'),
            new URL('http://my-validator-app-api'),
            undefined, //previously used if you used access token
            authTokenProvider
        )
    }

    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localNetAuthDefault,
        ledgerFactory: myLedgerFactory,
        //topologyFactory: myTopologyFactory,
        validatorFactory: myValidatorFactory,
        tokenStandardFactory: myTokenStandardFactory,
    })
    await sdk.connect()
    await sdk.connectAdmin()
    //an alternative here is the use the synchronizer directly like
    //await sdk.connectTopology('global-domain::22200...')
    await sdk.connectTopology(new URL('http://my-scan-proxy-api'))

    await sdk.tokenStandard!.setTransferFactoryRegistryUrl(
        new URL('http://my-registry-api')
    )
}
