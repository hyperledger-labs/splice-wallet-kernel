export type UserId = string

export interface AuthService {
    connected(): boolean
    getUserId(): UserId
}
