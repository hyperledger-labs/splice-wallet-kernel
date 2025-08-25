import { SignJWT } from 'jose'
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
    get userId(): string | undefined {
        return this._userId
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

export class UnsafeAuthController implements AuthController {
    userId: string | undefined
    adminId: string | undefined
    audience: string | undefined
    unsafeSecret: string | undefined

    private _logger: Logger | undefined

    constructor(logger?: Logger) {
        this._logger = logger
    }
    async getAdminToken(): Promise<AuthContext> {
        return this._createJwtToken(this.adminId || 'admin')
    }

    async getUserToken(): Promise<AuthContext> {
        return this._createJwtToken(this.userId || 'user')
    }

    private async _createJwtToken(sub: string): Promise<AuthContext> {
        if (!this.unsafeSecret) throw new Error('unsafeSecret is not set')
        const secret = new TextEncoder().encode(this.unsafeSecret)
        const now = Math.floor(Date.now() / 1000)
        const jwt = await new SignJWT({
            sub,
            aud: this.audience || '',
            iat: now,
            exp: now + 60 * 60, // 1 hour expiry
            iss: 'unsafe-auth',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret)
        return { userId: sub, accessToken: jwt }
    }
}

export const localNetAuthDefault = (logger?: Logger): AuthController => {
    const controller = new UnsafeAuthController(logger)

    controller.userId = 'ledger-api-user'
    controller.adminId = 'ledger-api-user'
    controller.audience = 'https://canton.network.global'
    controller.unsafeSecret = 'unsafe'

    return controller
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
