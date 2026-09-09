import {
    SDK,
    SDKPlugin,
    type SDKPluginContext,
    localNetGlobalSynchronizer,
} from '@canton-network/wallet-sdk'

export default async function () {
    const sdk = (
        await SDK.create({
            auth: {
                method: 'self_signed',
                issuer: 'unsafe-auth',
                credentials: {
                    clientId: 'ledger-api-user',
                    clientSecret: 'unsafe',
                    audience: 'https://canton.network.global',
                    scope: '',
                },
            },
            ledgerClientUrl: 'http://localhost:2975',
            synchronizerId: localNetGlobalSynchronizer,
        })
    ).registerPlugins([
        class MyPlugin extends SDKPlugin<'myPlugin'> {
            // wallet-sdk plugin should always accept SDKPluginContext
            constructor(protected readonly ctx: SDKPluginContext) {
                super('myPlugin', ctx)
            }

            myMethod() {
                // do some logic
                return
            }
        },
    ])

    sdk.myPlugin.myMethod()
}
