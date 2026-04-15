import { GenerateTransactionResponse } from '@canton-network/core-ledger-client'
import { KeyPair } from '@canton-network/core-signing-lib'
import pino from 'pino'
import {
    TokenNamespace,
    AmuletNamespace,
    SDKInterface,
} from '@canton-network/wallet-sdk'

export type RewardsForDepositsTestScriptParameters = {
    sdk: SDKInterface
    amulet: AmuletNamespace
    token: TokenNamespace
    sender: GenerateTransactionResponse
    treasury: GenerateTransactionResponse
    senderKeys: KeyPair
    treasuryKeys: KeyPair
    logger: pino.Logger
    commandArgs: Parameters<
        TokenNamespace['transfer']['delegatedProxy']['commands'][
            | 'accept'
            | 'reject'
            | 'withdraw']
    >['0']
}
