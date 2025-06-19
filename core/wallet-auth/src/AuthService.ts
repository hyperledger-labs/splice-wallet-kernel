export type UserId = string

export interface AuthContext {
    userId: UserId
}

export interface AuthService {
    verifyToken(token: string): Promise<AuthContext | undefined>
}

export interface AuthAware<T> {
    authContext: AuthContext | undefined
    withAuthContext: (context?: AuthContext) => T
}
