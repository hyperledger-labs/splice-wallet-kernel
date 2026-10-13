import type { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import type { KeyPair } from '@canton-network/core-signing-lib'
import type { SDKInterface } from '@canton-network/wallet-sdk'
import type { Logger } from 'pino'

export type TransferTestScriptParameters = {
    sdk: SDKInterface<'amulet' | 'token'>
    sender: GenerateTransactionResponse
    receiver: GenerateTransactionResponse
    senderKeys: KeyPair
    receiverKeys: KeyPair
    logger: Logger
}
