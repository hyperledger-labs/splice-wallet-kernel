import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import { KeyPair } from '@canton-network/core-signing-lib'
import { SDKInterface } from '@canton-network/wallet-sdk'
import pino from 'pino'

export type RewardsForDepositsTestScriptParameters = {
    sdk: SDKInterface
    token: Awaited<ReturnType<SDKInterface['token']>>
    amulet: Awaited<ReturnType<SDKInterface['amulet']>>
    sender: GenerateTransactionResponse
    treasury: GenerateTransactionResponse
    senderKeys: KeyPair
    treasuryKeys: KeyPair
    logger: pino.Logger
    commandArgs: Parameters<
        Awaited<
            ReturnType<SDKInterface['token']>
        >['transfer']['delegatedProxy']['commands'][
            | 'accept'
            | 'reject'
            | 'withdraw']
    >['0']
}
