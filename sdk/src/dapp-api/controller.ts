import { popupHref } from 'core-wallet-ui-components'
import buildController from './rpc-gen'
import {
    StatusResult,
    ConnectResult,
    PrepareReturnResult,
    PrepareExecuteResult,
    LedgerApiResult,
    RequestAccountsResult,
} from './rpc-gen/typings'
import { isSpliceMessage, SuccessResponse, WalletEvent } from 'core-types'
import * as userApi from 'core-wallet-user-rpc-client'

enum WK_URL {
    LOGIN = '/login/',
}

const popupInteraction = async <T>(
    url: URL,
    callback: (data: SuccessResponse) => T
): Promise<T> => {
    const win = await popupHref(url)
    console.log('popup window opened', win)
    let eventReceived = false
    return new Promise((resolve, reject) => {
        const listener = (event: MessageEvent) => {
            console.log('user has done stuff in the UI', event.data)

            // TODO: check that is of type some user api result?
            if (
                isSpliceMessage(event.data) &&
                event.data.type === WalletEvent.SPLICE_WALLET_USER_RESPONSE
            ) {
                window.removeEventListener('message', listener)
                eventReceived = true

                if ('error' in event.data.response) {
                    console.error(
                        'Error in user response:',
                        event.data.response.error
                    )
                    reject(event.data.response.error)
                } else {
                    console.log(
                        'User response received:',
                        event.data.response.result
                    )
                    resolve(callback(event.data.response))
                }
            }
        }
        window.addEventListener('message', listener)

        const interval = setInterval(() => {
            if (!win || win.closed) {
                clearInterval(interval)
                window.removeEventListener('message', listener)
                if (eventReceived === false) {
                    reject('User closed the wallet window prior to interaction')
                }
            }
        }, 1000)
    })
}

export const dappController = (rpcUrl: URL, uiUrl: URL) => {
    console.log(
        'Creating dapp controller with rpcUrl:',
        rpcUrl,
        'and uiUrl:',
        uiUrl
    )
    const url = (page: WK_URL) => new URL(page, uiUrl)
    return buildController({
        status: function (): Promise<StatusResult> {
            return Promise.resolve({
                kernel: {
                    id: 'kernel-id', // TODO: get from userApi
                    clientType: 'remote',
                    url: 'url', // TODO: get from userApi
                },
                isConnected: false,
                chainId: 'chain-id', // TODO: get from userApi
            })
        },
        connect: async function (): Promise<ConnectResult> {
            return popupInteraction(
                url(WK_URL.LOGIN),
                (data: SuccessResponse) => {
                    const addSessionResult =
                        data.result as userApi.AddSessionResult
                    console.log(
                        'User has logged in, received result:',
                        addSessionResult
                    )
                    return {
                        kernel: {
                            id: 'kernel-id', // TODO: get from userApi
                            clientType: 'remote',
                            url: 'url', // TODO: get from userApi
                        },
                        isConnected: true,
                        chainId: addSessionResult.network.chainId,
                        userUrl: 'user-url', // TODO: get from userApi
                        sessionToken: addSessionResult.accessToken,
                    }
                }
            )
        },
        darsAvailable: async () => ({ dars: ['default-dar'] }),
        prepareReturn: function (): Promise<PrepareReturnResult> {
            throw new Error('Function not implemented.')
        },
        prepareExecute: function (): Promise<PrepareExecuteResult> {
            throw new Error('Function not implemented.')
        },
        ledgerApi: function (): Promise<LedgerApiResult> {
            throw new Error('Function not implemented.')
        },
        onConnected: async () => {
            throw new Error('Only for events.')
        },
        onAccountsChanged: async () => {
            throw new Error('Only for events.')
        },
        requestAccounts: function (): Promise<RequestAccountsResult> {
            return Promise.resolve([])
        },
        onTxChanged: async () => {
            throw new Error('Only for events.')
        },
    })
}
