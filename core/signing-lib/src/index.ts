import { AuthContext } from '@splice/core-wallet-auth'
import { Methods } from './rpc-gen/index.js'
import { Error as RpcError } from './rpc-gen/typings.js'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

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

export interface KeyPair {
    publicKey: string
    privateKey: string
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

export const signTransactionHash = (
    txHash: string,
    privateKey: string
): string => {
    const decodedKey = naclUtil.decodeBase64(privateKey)

    return naclUtil.encodeBase64(
        nacl.sign.detached(naclUtil.decodeBase64(txHash), decodedKey)
    )
}

export const getPublicKeyFromPrivate = (privateKey: string): string => {
    const secretKey = naclUtil.decodeBase64(privateKey)
    // The public key is the last 32 bytes of the secretKey for Ed25519
    const publicKey = secretKey.slice(32)
    return naclUtil.encodeBase64(publicKey)
}

export const createKeyPair = (): KeyPair => {
    const key = nacl.sign.keyPair()
    const publicKey = naclUtil.encodeBase64(key.publicKey)
    const privateKey = naclUtil.encodeBase64(key.secretKey)

    return { publicKey, privateKey }
}
