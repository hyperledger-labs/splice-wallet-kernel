import { Logger } from '@splice/core-types'
import { AuthContext, ClientCredentialsService } from '@splice/core-wallet-auth'

export interface AuthController {
    getUserToken(): Promise<AuthContext>
    getAdminToken(): Promise<AuthContext>
    userId: string | undefined
}

export class ClientCredentialOAuthController implements AuthController {
    set logger(value: Logger) {
        this._logger = value
        this.service = new ClientCredentialsService(
            this._configUrl,
            this._logger
        )
    }
    set audience(value: string) {
        this._audience = value
    }
    set scope(value: string) {
        this._scope = value
    }
    set configUrl(value: string) {
        this._configUrl = value
        this.service = new ClientCredentialsService(
            this._configUrl,
            this._logger
        )
    }
    set adminSecret(value: string) {
        this._adminSecret = value
    }
    set adminId(value: string) {
        this._adminId = value
    }
    set userSecret(value: string) {
        this._userSecret = value
    }
    set userId(value: string) {
        this._userId = value
    }

    private service: ClientCredentialsService
    private _logger: Logger | undefined
    private _configUrl: string
    private _userId: string | undefined
    private _userSecret: string | undefined
    private _adminId: string | undefined
    private _adminSecret: string | undefined
    private _scope: string | undefined
    private _audience: string | undefined

    constructor(
        configUrl: string,
        logger?: Logger,
        userId?: string,
        userSecret?: string,
        adminId?: string,
        adminSecret?: string,
        scope?: string,
        audience?: string
    ) {
        this.service = new ClientCredentialsService(configUrl, logger)
        this._configUrl = configUrl
        this._logger = logger
        this._userId = userId
        this._userSecret = userSecret
        this._adminId = adminId
        this._adminSecret = adminSecret
        this._scope = scope
        this._audience = audience
    }

    async getUserToken(): Promise<AuthContext> {
        if (this._userId === undefined)
            throw new Error('UserId is not defined.')
        if (this._userSecret === undefined)
            throw new Error('UserSecret is not defined.')

        const accessToken = await this.service.fetchToken({
            clientId: this._userId!,
            clientSecret: this._userSecret!,
            scope: this._scope,
            audience: this._audience,
        })

        return {
            userId: this._userId!,
            accessToken,
        }
    }

    async getAdminToken(): Promise<AuthContext> {
        if (this._adminId === undefined)
            throw new Error('AdminId is not defined.')
        if (this._adminSecret === undefined)
            throw new Error('AdminSecret is not defined.')

        const accessToken = await this.service.fetchToken({
            clientId: this._adminId!,
            clientSecret: this._adminSecret!,
            scope: this._scope,
            audience: this._audience,
        })

        return {
            userId: this._adminId!,
            accessToken,
        }
    }
}

export const localAuthDefault = (logger?: Logger): AuthController => {
    const controller = new ClientCredentialOAuthController(
        'http://127.0.0.1:8889/.well-known/openid-configuration',
        logger
    )
    // keep these values aligned with client/test/config.json
    //TODO: Dynamically load these values
    controller.userId = 'operator'
    controller.userSecret = 'your-client-secret'
    controller.adminId = 'participant_admin'
    controller.adminSecret = 'admin-client-secret'
    controller.audience =
        'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424'
    controller.scope = 'openid daml_ledger_api offline_access'

    return controller
}
