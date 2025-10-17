import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTokenStandardDefault,
    AuthController,
    ClientCredentialOAuthController,
} from '@canton-network/wallet-sdk'

export default async function () {
    const participantId = 'my-participant-id'
    const myOAuthUrl = new URL('https://my-oauth-url')
    const myOAuthController = (logger?: Logger): AuthController => {
        const controller = new ClientCredentialOAuthController(
            //your oauth server
            `http://${myOAuthUrl.href}/.well-known/openid-configuration`,
            logger
        )

        //oAuth M2M token for client id and client secret
        controller.userId = 'your-client-id'
        controller.userSecret = 'your-client-secret'
        // these are only needed if you intend to use admin only functions
        // these can be different from your userId and userSecret
        // if they are the same you can supply it twice
        //controller.adminId = 'your-client-id'
        //controller.adminSecret = 'your-client-secret'
        controller.audience = `https://daml.com/jwt/aud/participant/${participantId}`
        controller.scope = 'openid daml_ledger_api offline_access'

        return controller
    }

    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: myOAuthController,
        ledgerFactory: localNetLedgerDefault,
        tokenStandardFactory: localNetTokenStandardDefault,
    })
}
