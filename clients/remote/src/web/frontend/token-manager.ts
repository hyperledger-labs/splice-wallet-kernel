class TokenManager {
    static LOCALSTORAGE_TOKEN_KEY = 'com.splice.wallet.access_token'

    private accessToken: string | undefined = undefined

    constructor() {
        this.accessToken =
            localStorage.getItem(TokenManager.LOCALSTORAGE_TOKEN_KEY) ||
            undefined
    }

    getAccessToken(): string | undefined {
        return this.accessToken
    }

    setAccessToken(token: string): void {
        this.accessToken = token
        localStorage.setItem(TokenManager.LOCALSTORAGE_TOKEN_KEY, token)
    }

    clearAccessToken(): void {
        this.accessToken = undefined
        localStorage.removeItem(TokenManager.LOCALSTORAGE_TOKEN_KEY)
    }
}

export const tokenManager = new TokenManager()
