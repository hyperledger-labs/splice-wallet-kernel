import { AuthContext } from 'core-wallet-auth'
import { Methods } from './rpc-gen/index.js'
import { Error as RpcError } from './rpc-gen/typings.js'

export { default as buildController, Methods } from './rpc-gen/index.js'
export * from './rpc-gen/typings.js'

export const CC_COIN_TYPE = 6767

export function isRpcError<T>(value: T | RpcError): value is RpcError {
    return (value as RpcError).error_description !== undefined
}

export enum PartyMode {
    INTERNAL = 'internal',
    EXTERNAL = 'external',
}

export enum SigningProvider {
    WALLET_KERNEL = 'wallet-kernel',
    PARTICIPANT = 'participant',
    FIREBLOCKS = 'fireblocks',
}

export interface SigningDriverInterface {
    partyMode: PartyMode
    signingProvider: SigningProvider
    controller: (userId: AuthContext['userId'] | undefined) => Methods
}
