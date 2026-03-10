import { KeyPair } from '@canton-network/core-signing-lib'
import { Sdk } from '@canton-network/wallet-sdk'
import pino from 'pino'
import { createParties } from '../common/createParties.js'

export type TransferTestScriptParameters = {
    sdk: Sdk
    sender: Awaited<ReturnType<typeof createParties>>['sender']
    receiver: Awaited<ReturnType<typeof createParties>>['receiver']
    senderKeys: KeyPair
    receiverKeys: KeyPair
    logger: pino.Logger
}
