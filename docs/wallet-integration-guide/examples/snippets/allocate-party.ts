import { SDK, localNetStaticConfig } from '@canton-network/wallet-sdk'

export default async function () {
    const auth = {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    }

    /*
    if using OAuth, provide a different auth config when initializing the SDK such as:
        const auth = {
        method: 'client_credentials',
        configUrl: 'https://my-oauth-url',
        credentials: {
            clientId: 'your-client-id',
            clientSecret: 'your-client-secret',
            audience: `https://daml.com/jwt/aud/participant/${participantId}`,
            scope: 'openid daml_ledger_api offline_access',
        },
    }
    */

    const sdk = await SDK.create({
        auth,
        ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    })

    const key = sdk.keys.generate()

    // partyHint is optional but recommended to make it easier to identify the party
    const partyHint = 'my-wallet-1'

    return await sdk.party.external
        .create(key.publicKey, { partyHint })
        .sign(key.privateKey)
        .execute()
}
