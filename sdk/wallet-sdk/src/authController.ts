export interface UserAuthToken {
    userId: string
    token: string
}

export interface AdminAuthToken {
    adminId: string
    token: string
}

export interface AuthController {
    getUserToken(): Promise<UserAuthToken>
    getAdminToken(): Promise<AdminAuthToken>
}

export class ClientCredentialOAuthController implements AuthController {
    set audience(value: string | undefined) {
        this._audience = value
    }
    set scope(value: string | undefined) {
        this._scope = value
    }
    set configUrl(value: string) {
        this._configUrl = value
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

    private _userId: string | undefined
    private _userSecret: string | undefined
    private _adminId: string | undefined
    private _adminSecret: string | undefined
    private _configUrl: string | undefined
    private _scope: string | undefined
    private _audience: string | undefined

    async getUserToken(): Promise<UserAuthToken> {
        if (this._userId === undefined)
            throw new Error('UserId is not defined.')
        if (this._userSecret === undefined)
            throw new Error('UserSecret is not defined.')
        if (this._configUrl === undefined)
            throw new Error('configUrl is not defined.')

        const response = await fetch(this._configUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: this.params(this._userId, this._userSecret).toString(),
        })

        if (!response.ok) {
            throw new Error(
                `Failed to fetch user token: ${response.status} ${response.statusText}`
            )
        }

        const json = await response.json()

        return {
            userId: this._userId!,
            token: json.access_token,
        }
    }

    async getAdminToken(): Promise<AdminAuthToken> {
        if (this._adminId === undefined)
            throw new Error('UserId is not defined.')
        if (this._adminSecret === undefined)
            throw new Error('UserSecret is not defined.')
        if (this._configUrl === undefined)
            throw new Error('configUrl is not defined.')

        const response = await fetch(this._configUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: this.params(this._adminId, this._adminSecret).toString(),
        })

        if (!response.ok) {
            throw new Error(
                `Failed to fetch user token: ${response.status} ${response.statusText}`
            )
        }

        const json = await response.json()

        return {
            adminId: this._userId!,
            token: json.access_token,
        }
    }

    private params(userId: string, userSecret: string): URLSearchParams {
        return new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: userId,
            client_secret: userSecret,
            scope: this._scope || '',
            audience: this._audience || '',
        })
    }
}

export const LocalAuthDefault = (): AuthController => {
    const controller = new ClientCredentialOAuthController()
    // keep these values aligned with client/test/config.json
    //TODO: Dynamically load these values
    controller.userId = 'operator'
    controller.userSecret = 'your-client-secret'
    controller.adminId = 'participant_admin'
    controller.adminSecret = 'admin-client-secret'
    controller.configUrl =
        'http://127.0.0.1:8889/.well-known/openid-configuration'
    return controller
}
