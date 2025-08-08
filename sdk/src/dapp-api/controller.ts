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
import { HttpClient } from '../http-client'
import * as storage from '../storage.js'

enum WK_URL {
    LOGIN = '/login/',
}

const popupInteraction = async <T>(
    url: URL,
    callback: (data: SuccessResponse) => T
): Promise<T> => {
    const win = await popupHref(url)
    let eventReceived = false
    return new Promise((resolve, reject) => {
        const listener = (event: MessageEvent) => {
            // TODO: check that is of type some user api result?
            if (
                isSpliceMessage(event.data) &&
                event.data.type === WalletEvent.SPLICE_WALLET_USER_RESPONSE
            ) {
                window.removeEventListener('message', listener)
                eventReceived = true

                if ('error' in event.data.response) {
                    reject(event.data.response.error)
                } else {
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
    const url = (page: WK_URL) => new URL(page, uiUrl)

    // Initialize the userApi client with the rpcUrl and sessionToken
    const sessionToken = storage.getKernelSession()?.accessToken
    if (!sessionToken) {
        console.warn('SDK: No session token found, proceeding without it')
    }
    let userClient = new HttpClient(rpcUrl, sessionToken)

    return buildController({
        status: async function (): Promise<StatusResult> {
            const info = await userClient.request<userApi.InfoResult>({
                method: 'info',
                params: [],
            })
            const session = await userClient.request<userApi.GetSessionResult>({
                method: 'getSession',
                params: [],
            })

            return Promise.resolve({
                kernel: {
                    id: info.kernel.id,
                    clientType: info.kernel.clientType,
                    url: '', // TODO: remove
                },
                isConnected: true,
                chainId: session.session.network.chainId,
            })
        },
        connect: async function (): Promise<ConnectResult> {
            return popupInteraction(
                url(WK_URL.LOGIN),
                async (data: SuccessResponse) => {
                    const session = data.result as userApi.AddSessionResult

                    // Store connection and notify the provider
                    storage.setKernelSession(session)
                    window.postMessage(
                        {
                            type: WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS,
                            token: session.accessToken,
                        },
                        '*'
                    )

                    userClient = new HttpClient(rpcUrl, session.accessToken)
                    const info = await userClient.request<userApi.InfoResult>({
                        method: 'info',
                        params: [],
                    })

                    return {
                        kernel: {
                            id: info.kernel.id,
                            clientType: info.kernel.clientType,
                            url: '', // TODO: remove
                        },
                        isConnected: true,
                        chainId: session.network.chainId,
                        userUrl: 'user-url', // TODO: get from userApi
                        sessionToken: session.accessToken,
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
