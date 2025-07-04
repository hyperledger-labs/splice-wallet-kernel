export interface AppConfig {
    userRpcUri: string
}

export const config: AppConfig = {
    userRpcUri: import.meta.env.VITE_USER_RPC_API,
}
