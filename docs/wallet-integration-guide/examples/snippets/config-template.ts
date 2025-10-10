import {
    WalletSDKImpl,
    LedgerController,
    TopologyController,
    ValidatorController,
    localNetAuthDefault,
} from '@canton-network/wallet-sdk'

// @disable-snapshot-test
export default async function () {
    const myLedgerFactory = (userId: string, token: string) => {
        return new LedgerController(
            userId,
            new URL('http://my-json-ledger-api'),
            token,
            false
        )
    }

    const myTopologyFactory = (
        userId: string,
        userAdminToken: string,
        synchronizerId: string
    ) => {
        return new TopologyController(
            'my-grpc-admin-api',
            new URL('http://my-json-ledger-api'),
            userId,
            userAdminToken,
            synchronizerId
        )
    }

    const myValidatorFactory = (userId: string, token: string) => {
        return new ValidatorController(
            userId,
            new URL('http://my-validator-app-api'),
            token
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
