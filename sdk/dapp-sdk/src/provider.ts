// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    ProviderType,
    SpliceProvider,
    EventListener,
} from '@canton-network/core-splice-provider'
import { DiscoverResult } from '@canton-network/core-types'
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
    RpcMethods,
} from '@canton-network/core-wallet-dapp-rpc-client'
import { ErrorCode } from './error.js'
import {
    PrepareReturnParams,
    Session,
    StatusEvent,
} from './dapp-api/rpc-gen/typings'
import { popup } from '@canton-network/core-wallet-ui-components'
import {
    HttpTransport,
    WindowTransport,
} from '@canton-network/core-rpc-transport'
import SpliceWalletJSONRPCDAppAPI from '@canton-network/core-wallet-dapp-rpc-client'

/**
 * The Provider class abstracts over the different types of SpliceProviders (Window and HTTP).
 * It selects the appropriate provider based on the wallet type discovered during the connection process.
 */
export class Provider implements SpliceProvider {
    private providerType: ProviderType
    private provider: SpliceProvider

    constructor({ walletType, url }: DiscoverResult, session?: Session) {
        if (walletType == 'extension') {
            const windowTransport = new WindowTransport(window)
            const windowClient = new SpliceWalletJSONRPCDAppAPI(windowTransport)

            this.providerType = ProviderType.WINDOW
            this.provider = new SpliceProviderWindow(windowClient)
        } else if (walletType == 'remote') {
            const remoteTransport = new HttpTransport(
                new URL(url),
                session?.accessToken
            )
            const remoteClient = new SpliceWalletJSONRPCDAppAPI(remoteTransport)

            this.providerType = ProviderType.HTTP
            this.provider = new SpliceProviderHttp(
                remoteClient,
                new URL(url),
                session?.accessToken
            )
        } else {
            throw new Error(`Unsupported wallet type ${walletType}`)
        }
    }

    request<M extends keyof RpcMethods>(
        method: M,
        params: RpcMethods[M]['params'][0]
    ) {
        if (this.providerType === ProviderType.WINDOW)
            return this.provider.request(method, params)

        const controller = dappController(this.provider)

        switch (method) {
            case 'status': {
                return controller.status()
            }
            case 'connect': {
                return controller.connect()
            }
            case 'disconnect': {
                return controller.disconnect()
            }
            case 'darsAvailable': {
                return controller.darsAvailable()
            }
            case 'ledgerApi': {
                if (!params) {
                    throw new Error('Missing parameters for ledgerApi')
                }
                return controller.ledgerApi(params as LedgerApiParams)
            }
            case 'prepareExecute': {
                if (!params) {
                    throw new Error('Missing parameters for prepareExecute')
                }
                return controller.prepareExecute(params as PrepareExecuteParams)
            }
            case 'prepareReturn': {
                if (!params) {
                    throw new Error('Missing parameters for prepareReturn')
                }
                return controller.prepareReturn(params as PrepareReturnParams)
            }
            case 'requestAccounts': {
                return controller.requestAccounts()
            }
            default: {
                throw new Error('Unsupported method')
            }
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
    details: string,
    timeoutMs: number = 10 * 1000 // default to 10 seconds
) =>
    setTimeout(() => {
        console.warn(`SDK: ${details}`)
        reject({
            status: 'error',
            error: ErrorCode.Timeout,
            details,
        })
    }, timeoutMs)

// Remote dApp API Server which wraps the Remote-dApp API Server with promises
export const dappController = (provider: SpliceProvider) =>
    buildController({
        connect: async (): Promise<StatusEvent> => {
            const response = await provider.request('connect')

            if (response.session) {
                return response
            } else {
                popup.open(response.kernel.userUrl ?? '')
                const promise = new Promise<dappAPI.StatusEvent>(
                    (resolve, reject) => {
                        // 5 minutes timeout
                        const timeout = withTimeout(
                            reject,
                            'Timeout waiting for connection',
                            5 * 60 * 1000
                        )
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
        disconnect: async () => provider.request('disconnect'),
        darsAvailable: async () => provider.request('darsAvailable'),
        ledgerApi: async (params: LedgerApiParams) =>
            provider.request('ledgerApi', params),
        prepareExecute: async (params: PrepareExecuteParams) => {
            const response = await provider.request('prepareExecute', params)

            if (response.userUrl) popup.open(response.userUrl)

            const promise = new Promise<dappAPI.PrepareExecuteResult>(
                (resolve, reject) => {
                    const timeout = withTimeout(
                        reject,
                        'Timed out waiting for transaction approval'
                    )

                    const listener = (event: dappRemoteAPI.TxChangedEvent) => {
                        if (event.status === 'executed') {
                            provider.removeListener('txChanged', listener)
                            clearTimeout(timeout)
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
        prepareReturn: async (params: PrepareReturnParams) =>
            provider.request('prepareReturn', params),
        status: async () => provider.request('status'),
        requestAccounts: async () => provider.request('requestAccounts'),
        onAccountsChanged: async () => {
            throw new Error('Only for events.')
        },
        onTxChanged: async () => {
            throw new Error('Only for events.')
        },
    })
