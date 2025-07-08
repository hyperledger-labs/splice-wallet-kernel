// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthContext } from 'core-wallet-auth'
import buildController from './rpc-gen/index.js'
import {
    KernelInfo,
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
} from './rpc-gen/typings.js'
import { Store } from 'core-wallet-store'
import { LedgerClient } from 'core-ledger-client'
import { v4 } from 'uuid'

const kernelInfo: KernelInfo = {
    id: 'remote-da',
    clientType: 'remote',
    url: 'http://localhost:3000/rpc',
}

export const dappController = (
    store: Store,
    ledgerClient: LedgerClient,
    context?: AuthContext
) =>
    buildController({
        connect: async () =>
            Promise.resolve({
                kernel: kernelInfo,
                isConnected: false,
                chainId: 'default-chain-id',
                userUrl: 'http://localhost:3002/login/',
            }),
        darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),
        prepareExecute: async (params: PrepareExecuteParams) =>
            Promise.resolve({ userUrl: 'default-url' }),
        prepareReturn: async (params: PrepareReturnParams) => {
            const wallet = await store.getPrimaryWallet()

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const prepareParams = {
                commandId: v4(),
                userId: 'some-user-id',
                actAs: [wallet.partyId],
                readAs: [],
                disclosedContracts: [],
                synchronizerId: '',
                verboseHashing: false,
                packageIdSelectionPreference: [],
                commands: params.commands,
            }

            return await ledgerClient.interactivePreparePost(prepareParams)
        },
        status: async () => {
            if (context === null) {
                return Promise.resolve({
                    kernel: kernelInfo,
                    isConnected: false,
                })
            } else {
                return Promise.resolve({
                    kernel: kernelInfo,
                    isConnected: true,
                    chainId: (await store.getCurrentNetwork()).name,
                })
            }
        },
        onConnected: async () => {
            throw new Error('Function not implemented.')
        },
    })
