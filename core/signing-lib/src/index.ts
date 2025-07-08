import { Methods } from './rpc-gen'
import { Error as RpcError } from './rpc-gen/typings'

export { default as buildController } from './rpc-gen'
export * from './rpc-gen/typings'

export const CC_COIN_TYPE = 6767

export function isRpcError<T>(value: T | RpcError): value is RpcError {
    return (value as RpcError).error_description !== undefined
}

export enum PartyMode {
    INTERNAL,
    EXTERNAL,
}

export enum SigningProvider {
    WALLET_KERNEL = 'wallet-kernel',
    PARTICIPANT = 'participant',
    FIREBLOCKS = 'fireblocks',
}

export interface SigningDriverInterface {
    partyMode: PartyMode
    signingProvider: SigningProvider
    controller: Methods
}
