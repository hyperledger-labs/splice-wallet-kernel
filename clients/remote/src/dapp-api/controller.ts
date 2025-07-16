// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthContext } from 'core-wallet-auth'
import buildController from './rpc-gen/index.js'
import {
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
} from './rpc-gen/typings.js'
import { Store } from 'core-wallet-store'
import {
    LedgerClient,
    InteractivePreparePostRes,
    InteractivePreparePostReq,
} from 'core-ledger-client'
import { v4 } from 'uuid'
import { NotificationService } from '../notification/NotificationService.js'
import { KernelInfo as KernelInfoConfig } from '../config/Config.js'

async function prepareSubmission(
    userId: string,
    partyId: string,
    synchronizerId: string,
    commands: unknown,
    ledgerClient: LedgerClient,
    commandId?: string
): Promise<InteractivePreparePostRes> {
    const prepareParams: InteractivePreparePostReq = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
        commands: commands as any,
        commandId: commandId || v4(),
        userId,
        actAs: [partyId],
        readAs: [],
        disclosedContracts: [],
        synchronizerId,
        verboseHashing: false,
        packageIdSelectionPreference: [],
    }

    return await ledgerClient.interactivePreparePost(prepareParams)
}

export const dappController = (
    kernelInfo: KernelInfoConfig,
    store: Store,
    notificationService: NotificationService,
    ledgerClient: LedgerClient,
    context?: AuthContext
) =>
    buildController({
        connect: async () => ({
            kernel: kernelInfo,
            isConnected: false,
            chainId: 'default-chain-id',
            userUrl: 'http://localhost:3002/login/',
        }),
        darsAvailable: async () => ({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) => ({
            response: 'default-response',
        }),
        prepareExecute: async (params: PrepareExecuteParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()

            if (context === undefined) {
                throw new Error('Unauthenticated context')
            }

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            const userId = context.userId
            const notifier = notificationService.getNotifier(userId)
            const commandId = v4()

            notifier.emit('txChanged', { status: 'pending', commandId })

            const { preparedTransactionHash, preparedTransaction = '' } =
                await prepareSubmission(
                    context.userId,
                    wallet.partyId,
                    network.synchronizerId,
                    params.commands,
                    ledgerClient,
                    commandId
                )

            store.setTransaction({
                commandId,
                status: 'pending',
                preparedTransaction,
                preparedTransactionHash,
                payload: params.commands,
            })

            return {
                userUrl: `http://localhost:3002/approve/index.html?commandId=${commandId}`,
            }
        },
        prepareReturn: async (params: PrepareReturnParams) => {
            const wallet = await store.getPrimaryWallet()
            const network = await store.getCurrentNetwork()

            if (context === undefined) {
                throw new Error('Unauthenticated context')
            }

            if (wallet === undefined) {
                throw new Error('No primary wallet found')
            }

            return prepareSubmission(
                context.userId,
                wallet.partyId,
                network.synchronizerId,
                params.commands,
                ledgerClient
            )
        },
        status: async () => {
            if (context === null) {
                return {
                    kernel: kernelInfo,
                    isConnected: false,
                }
            } else {
                return {
                    kernel: kernelInfo,
                    isConnected: true,
                    chainId: (await store.getCurrentNetwork()).networkId,
                }
            }
        },
        onConnected: async () => {
            throw new Error('Only for events.')
        },
        onAccountsChanged: async () => {
            throw new Error('Only for events.')
        },
        onTxChanged: async () => {
            throw new Error('Only for events.')
        },
    })
