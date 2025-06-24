import { Methods } from './rpc-gen'
import { Error as RpcError } from './rpc-gen/typings'

export { default as buildController } from './rpc-gen'
export * from './rpc-gen/typings'

export function isRpcError<T>(value: T | RpcError): value is RpcError {
    return (value as RpcError).error_description !== undefined
}

export interface SignerInterface {
    signerController: Methods
}
