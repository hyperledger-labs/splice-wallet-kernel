// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ProviderType,
    SpliceProvider,
    EventListener,
} from '@canton-network/core-splice-provider'
import {
    DiscoverResult,
    RequestPayload,
    SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import { popupHref } from '@canton-network/core-wallet-ui-components'
import { SpliceProviderWindow } from '@canton-network/core-splice-provider/src/SpliceProviderWindow'
import { SpliceProviderHttp } from '@canton-network/core-splice-provider/src/SpliceProviderHttp'
import buildController from './dapp-api/rpc-gen'
import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import * as dappRemoteAPI from '@canton-network/core-wallet-dapp-remote-rpc-client'
import {
    LedgerApiParams,
    PrepareExecuteParams,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { ErrorCode } from './index'

/**
 * The Provider class abstracts over the different types of SpliceProviders (Window and HTTP).
 * It selects the appropriate provider based on the wallet type discovered during the connection process.
 */
export class Provider implements SpliceProvider {
    private providerType: ProviderType
    private httpProvider?: SpliceProvider
    private windowProvider?: SpliceProvider

    constructor({ walletType, url }: DiscoverResult, sessionToken?: string) {
        if (walletType == 'extension') {
            this.providerType = ProviderType.WINDOW
            this.windowProvider = new SpliceProviderWindow()
        } else if (walletType == 'remote') {
            this.providerType = ProviderType.HTTP
            this.httpProvider = new SpliceProviderHttp(
                new URL(url),
                sessionToken
            )
        } else {
            throw new Error(`Unsupported wallet type ${walletType}`)
        }
    }

    private getProvider(): SpliceProvider {
        if (this.providerType === ProviderType.WINDOW)
            return this.windowProvider!
        return this.httpProvider!
    }

    request<T>(args: RequestPayload): Promise<T> {
        if (this.providerType === ProviderType.WINDOW)
            return this.getProvider().request(args)

        const controller = dappController(this.getProvider())
        switch (args.method) {
            case 'status':
                return controller.status() as Promise<T>
            case 'connect':
                return controller.connect() as Promise<T>
            case 'darsAvailable':
                return controller.darsAvailable() as Promise<T>
            case 'ledgerApi':
                return controller.ledgerApi(
                    args.params as LedgerApiParams
                ) as Promise<T>
            case 'prepareExecute':
                return controller.prepareExecute(
                    args.params as PrepareExecuteParams
                ) as Promise<T>
            case 'prepareReturn':
                return controller.prepareReturn(
                    args.params as dappAPI.PrepareReturnParams
                ) as Promise<T>
            case 'requestAccounts':
                return controller.requestAccounts() as Promise<T>
            case 'onAccountsChanged':
                throw new Error('Only for events.')
            case 'onTxChanged':
                throw new Error('Only for events.')
            default:
                throw new Error('Unsupported method')
        }
    }

    on<T>(event: string, listener: EventListener<T>): SpliceProvider {
        return this.getProvider().on(event, listener)
    }

    emit<T>(event: string, ...args: T[]): boolean {
        return this.getProvider().emit(event, args)
    }

    removeListener<T>(
        event: string,
        listenerToRemove: EventListener<T>
    ): SpliceProvider {
        return this.getProvider().removeListener(event, listenerToRemove)
    }
}

export const openKernelUserUI = (
    walletType: DiscoverResult['walletType'],
    userUrl: string
) => {
    switch (walletType) {
        case 'remote':
            popupHref(new URL(userUrl))
            break
        case 'extension': {
            const msg: SpliceMessage = {
                type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                url: userUrl,
            }
            window.postMessage(msg, '*')
            break
        }
    }
}

const withTimeout = (reject: (reason?: unknown) => void) =>
    setTimeout(() => {
        console.warn('SDK: Timeout waiting for connection')
        reject({
            status: 'error',
            error: ErrorCode.Timeout,
            details: 'Timeout waiting for connection',
        })
    }, 10 * 1000) // 10 seconds

// Remote dApp API Server which wraps the Remote-dApp API Server with promises
export const dappController = (provider: SpliceProvider) =>
    buildController({
        connect: async () => {
            const response =
                await provider.request<dappRemoteAPI.ConnectResult>({
                    method: 'connect',
                })
            if (!response.isConnected)
                openKernelUserUI('remote', response.userUrl)

            const promise = new Promise<dappAPI.ConnectResult>(
                (resolve, reject) => {
                    const timeout = withTimeout(reject)
                    provider.on<dappRemoteAPI.OnConnectedEvent>(
                        'onConnected',
                        (event) => {
                            clearTimeout(timeout)
                            const result: dappAPI.ConnectResult = {
                                kernel: event.kernel,
                                isConnected: true,
                                chainId: event.chainId,
                                sessionToken: event.sessionToken ?? '',
                                userUrl: event.userUrl,
                            }
                            resolve(result)
                        }
                    )
                }
            )

            return promise
        },
        darsAvailable: async () =>
            provider.request<dappRemoteAPI.DarsAvailableResult>({
                method: 'darsAvailable',
            }),
        ledgerApi: async (params: LedgerApiParams) =>
            provider.request<dappRemoteAPI.LedgerApiResult>({
                method: 'ledgerApi',
                params,
            }),
        prepareExecute: async (params: PrepareExecuteParams) => {
            const response =
                await provider.request<dappRemoteAPI.PrepareExecuteResult>({
                    method: 'prepareExecute',
                    params,
                })

            if (!response.isConnected)
                openKernelUserUI('remote', response.userUrl)

            const promise = new Promise<dappAPI.PrepareExecuteResult>(
                (resolve, reject) => {
                    const timeout = withTimeout(reject)
                    provider.on<dappRemoteAPI.TxChangedEvent>(
                        'onTxChanged',
                        (event) => {
                            console.log('SDK: TxChangedEvent', event)
                            clearTimeout(timeout)

                            if (event.status === 'executed') {
                                resolve({
                                    tx: event,
                                })
                            }
                        }
                    )
                }
            )

            return promise
        },
        prepareReturn: async (params: dappAPI.PrepareReturnParams) =>
            provider.request<dappAPI.PrepareReturnResult>({
                method: 'prepareReturn',
                params,
            }),
        status: async () =>
            provider.request<dappAPI.StatusResult>({ method: 'status' }),
        requestAccounts: async () =>
            provider.request<dappRemoteAPI.RequestAccountsResult>({
                method: 'requestAccounts',
            }),
        onAccountsChanged: async () => {
            throw new Error('Only for events.')
        },
        onTxChanged: async () => {
            throw new Error('Only for events.')
        },
    })
