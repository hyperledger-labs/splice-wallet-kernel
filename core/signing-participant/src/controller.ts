import {
    buildController,
    CreateKeyResult,
    GetConfigurationResult,
    GetKeysResult,
    GetTransactionResult,
    GetTransactionsResult,
    PartyMode,
    SetConfigurationResult,
    SigningDriverInterface,
    SigningProvider,
    SignTransactionParams,
    SignTransactionResult,
    SubscribeTransactionsResult,
} from 'core-signing-lib'
import { randomUUID } from 'node:crypto'

export class ParticipantSigningDriver implements SigningDriverInterface {
    public partyMode = PartyMode.INTERNAL
    public signingProvider = SigningProvider.PARTICIPANT

    public controller = (
        _userId: string | undefined // eslint-disable-line @typescript-eslint/no-unused-vars
    ) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                return Promise.resolve({
                    txId: params.internalTxId || randomUUID(),
                    status: 'signed',
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
