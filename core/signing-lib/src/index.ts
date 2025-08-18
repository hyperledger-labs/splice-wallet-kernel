import { AuthContext } from 'core-wallet-auth'
import { Methods } from './rpc-gen/index.js'
import { Error as RpcError, Transaction } from './rpc-gen/typings.js'
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

export enum SigningProvider {
    WALLET_KERNEL = 'wallet-kernel',
    PARTICIPANT = 'participant',
    FIREBLOCKS = 'fireblocks',
    OFFLINE = 'offline',
}

export interface SigningDriverInterface {
    partyMode: PartyMode
    signingProvider: SigningProvider
    controller: (userId: AuthContext['userId'] | undefined) => Methods
}

export interface InternalKey {
    id: string
    name: string
    publicKey: string
    privateKey: string
}

export interface InternalTransaction {
    id: string
    hash: string
    signature: string
    publicKey: string
    createdAt: Date
}

export const convertInternalTransaction = (
    tx: InternalTransaction
): Transaction => {
    return {
        txId: tx.id,
        status: 'signed',
        signature: tx.signature,
        publicKey: tx.publicKey,
    }
}

export const offlineSignTransaction = (
    txId: string,
    txHash: string,
    privateKey: string
): InternalTransaction => {
    const decodedKey = naclUtil.decodeBase64(privateKey)
    const keyPair = nacl.sign.keyPair.fromSecretKey(decodedKey)
    const signature = naclUtil.encodeBase64(
        nacl.sign.detached(naclUtil.decodeBase64(txHash), decodedKey)
    )

    return {
        id: txId,
        hash: txHash,
        signature,
        publicKey: naclUtil.encodeBase64(keyPair.publicKey),
        createdAt: new Date(),
    }
}
