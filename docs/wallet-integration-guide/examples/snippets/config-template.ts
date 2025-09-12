import {
    WalletSDKImpl,
    LedgerController,
    TopologyController,
    ValidatorController,
    localNetAuthDefault,
} from '@canton-network/wallet-sdk'

const myLedgerFactory = (userId: string, token: string) => {
    return new LedgerController(userId, 'my-json-ledger-api', token)
}

const myTopologyFactory = (
    userId: string,
    userAdminToken: string,
    synchronizerId: string
) => {
    return new TopologyController(
        'my-grpc-admin-api',
        'my-json-ledger-api',
        userId,
        userAdminToken,
        synchronizerId
    )
}

const myValidatorFactory = (userId: string, token: string) => {
    return new ValidatorController(userId, 'my-validator-app-api', token)
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
await sdk.connectTopology(new URL('my-scan-api'))
