// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    buildController,
    type CreateKeyResult,
    type GetConfigurationResult,
    type GetKeysResult,
    type GetTransactionResult,
    type GetTransactionsResult,
    PartyMode,
    type SetConfigurationResult,
    type SigningDriverInterface,
    SigningProvider,
    type SignMessageResult,
    type SignTransactionParams,
    type SignTransactionResult,
    type SubscribeTransactionsResult,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'

export class ParticipantSigningDriver implements SigningDriverInterface {
    public partyMode = PartyMode.INTERNAL
    public signingProvider = SigningProvider.PARTICIPANT

    public controller = (_userId: AuthContext['userId'] | undefined) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                return Promise.resolve({
                    txId: params.internalTxId || crypto.randomUUID(),
                    status: 'signed',
                    signature: 'none',
                })
            },
            signMessage: async (): Promise<SignMessageResult> => {
                return Promise.resolve({
                    error: 'not_allowed',
                    error_description:
                        'Signing messages is not supported with Participant.',
                })
            },
            getTransaction: function (): Promise<GetTransactionResult> {
                throw new Error('Function not implemented.')
            },
            getTransactions: function (): Promise<GetTransactionsResult> {
                throw new Error('Function not implemented.')
            },
            getKeys: function (): Promise<GetKeysResult> {
                throw new Error('Function not implemented.')
            },
            createKey: function (): Promise<CreateKeyResult> {
                throw new Error('Function not implemented.')
            },
            getConfiguration: function (): Promise<GetConfigurationResult> {
                throw new Error('Function not implemented.')
            },
            setConfiguration: function (): Promise<SetConfigurationResult> {
                throw new Error('Function not implemented.')
            },
            subscribeTransactions:
                function (): Promise<SubscribeTransactionsResult> {
                    throw new Error('Function not implemented.')
                },
        })
}
