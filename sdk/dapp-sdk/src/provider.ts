// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ProviderType,
    SpliceProvider,
    EventListener,
} from '@canton-network/core-splice-provider'
import { DiscoverResult, RequestPayload } from '@canton-network/core-types'
import {
    SpliceProviderHttp,
    SpliceProviderWindow,
} from '@canton-network/core-splice-provider'
import buildController from './dapp-api/rpc-gen'
import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import * as dappRemoteAPI from '@canton-network/core-wallet-dapp-remote-rpc-client'
import {
    LedgerApiParams,
    PrepareExecuteParams,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { ErrorCode } from './error.js'
import { Session, StatusEvent } from './dapp-api/rpc-gen/typings'
import { gatewayUi } from './ui'

/**
 * The Provider class abstracts over the different types of SpliceProviders (Window and HTTP).
 * It selects the appropriate provider based on the wallet type discovered during the connection process.
 */
export class Provider implements SpliceProvider {
    private providerType: ProviderType
    private provider: SpliceProvider

    constructor({ walletType, url }: DiscoverResult, session?: Session) {
        if (walletType == 'extension') {
            this.providerType = ProviderType.WINDOW
            this.provider = new SpliceProviderWindow()
        } else if (walletType == 'remote') {
            this.providerType = ProviderType.HTTP
            this.provider = new SpliceProviderHttp(
                new URL(url),
                session?.accessToken
            )
        } else {
            throw new Error(`Unsupported wallet type ${walletType}`)
        }
    }

    request<T>(args: RequestPayload): Promise<T> {
        if (this.providerType === ProviderType.WINDOW)
            return this.provider.request(args)

        const controller = dappController(this.provider)
        switch (args.method) {
            case 'status':
                return controller.status() as Promise<T>
            case 'connect':
                return controller.connect() as Promise<T>
            case 'disconnect':
                return controller.disconnect() as Promise<T>
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
            default:
                throw new Error('Unsupported method')
        }
    }

    on<T>(event: string, listener: EventListener<T>): SpliceProvider {
        return this.provider.on(event, listener)
    }

    emit<T>(event: string, ...args: T[]): boolean {
        return this.provider.emit(event, args)
    }

    removeListener<T>(
        event: string,
        listenerToRemove: EventListener<T>
    ): SpliceProvider {
        return this.provider.removeListener(event, listenerToRemove)
    }
}

const withTimeout = (
    reject: (reason?: unknown) => void,
    timeoutMs: number = 10 * 1000 // default to 10 seconds
) =>
    setTimeout(() => {
        console.warn('SDK: Timeout waiting for connection')
        reject({
            status: 'error',
            error: ErrorCode.Timeout,
            details: 'Timeout waiting for connection',
        })
    }, timeoutMs)

// Remote dApp API Server which wraps the Remote-dApp API Server with promises
export const dappController = (provider: SpliceProvider) =>
    buildController({
        connect: async (): Promise<StatusEvent> => {
            const response = await provider.request<dappRemoteAPI.StatusEvent>({
                method: 'connect',
            })

            if (response.session) {
                return response
            } else {
                gatewayUi.open('remote', response.userUrl ?? '')
                const promise = new Promise<dappAPI.StatusEvent>(
                    (resolve, reject) => {
                        // 5 minutes timeout
                        const timeout = withTimeout(reject, 5 * 60 * 1000)
                        provider.on<dappRemoteAPI.StatusEvent>(
                            'onConnected',
                            (event) => {
                                clearTimeout(timeout)
                                resolve(event)
                            }
                        )
                    }
                )

                return promise
            }
        },
        disconnect: async () => {
            return await provider.request<dappRemoteAPI.Null>({
                method: 'disconnect',
            })
        },
        darsAvailable: async () => {
            return provider.request<dappRemoteAPI.DarsAvailableResult>({
                method: 'darsAvailable',
            })
        },
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

            if (response.userUrl) gatewayUi.open('remote', response.userUrl)

            const promise = new Promise<dappAPI.PrepareExecuteResult>(
                (resolve) => {
                    const listener = (event: dappRemoteAPI.TxChangedEvent) => {
                        if (event.status === 'executed') {
                            provider.removeListener('txChanged', listener)
                            resolve({
                                tx: event,
                            })
                        }
                    }

                    provider.on<dappRemoteAPI.TxChangedEvent>(
                        'txChanged',
                        listener
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
        status: async () => {
            return provider.request<dappAPI.StatusEvent>({ method: 'status' })
        },
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
