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
import {
    HttpTransport,
    isSpliceMessage,
    RequestPayload,
    SuccessResponse,
    WalletEvent,
} from 'core-types'
import * as userApi from 'core-wallet-user-rpc-client'
import { SDK } from '../enums'

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

class UserClient {
    private transport: HttpTransport

    constructor(url: URL, sessionToken?: string) {
        this.transport = new HttpTransport(url, sessionToken)
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        const response = await this.transport.submit({ method, params })
        if ('error' in response) throw new Error(response.error.message)
        return response.result as T
    }
}

export const dappController = (rpcUrl: URL, uiUrl: URL) => {
    const url = (page: WK_URL) => new URL(page, uiUrl)
    let sessionToken: string | undefined = undefined
    const session = localStorage.getItem(SDK.LOCAL_STORAGE_KEY_SESSION)
    if (session) {
        try {
            const sessionData = JSON.parse(session) as userApi.AddSessionResult
            sessionToken = sessionData.accessToken
            console.log('SDK: Restored session:', sessionData)
        } catch (e) {
            console.error('Failed to parse stored session:', e)
        }
    }
    let userClient = new UserClient(rpcUrl, sessionToken)

    return buildController({
        status: async function (): Promise<StatusResult> {
            const info = await userClient.request<userApi.InfoResult>({
                method: 'info',
                params: [],
            })
            try {
                const session =
                    await userClient.request<userApi.GetSessionResult>({
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
                    chainId: session.chainId,
                })
            } catch (error) {
                console.error('Error fetching session:', error)
                return Promise.resolve({
                    kernel: {
                        id: info.kernel.id,
                        clientType: info.kernel.clientType,
                        url: '', // TODO: remove
                    },
                    isConnected: false,
                })
            }
        },
        connect: async function (): Promise<ConnectResult> {
            return popupInteraction(
                url(WK_URL.LOGIN),
                async (data: SuccessResponse) => {
                    const session = data.result as userApi.AddSessionResult
                    console.log('User has logged in, received result:', session)
                    userClient = new UserClient(rpcUrl, session.accessToken)

                    // TODO: localstorage service
                    localStorage.setItem(
                        SDK.LOCAL_STORAGE_KEY_SESSION,
                        JSON.stringify(session)
                    )

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
