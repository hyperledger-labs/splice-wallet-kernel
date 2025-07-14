export type UserId = string

export interface AuthContext {
    userId: UserId
    accessToken: string
}

export interface AuthService {
    verifyToken(accessToken?: string): Promise<AuthContext | undefined>
}

export interface AuthAware<T> {
    authContext: AuthContext | undefined
    withAuthContext: (context?: AuthContext) => T
}
