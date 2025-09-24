// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { discover, popupHref } from '@canton-network/core-wallet-ui-components'
import {
    injectSpliceProvider,
    ProviderType,
    SpliceProvider,
} from '@canton-network/core-splice-provider'
import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import * as dappRemoteAPI from '@canton-network/core-wallet-dapp-remote-rpc-client'
import * as storage from '../storage'
import {
    DiscoverResult,
    SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import buildController from '../dapp-api/rpc-gen/index.js'
import { PrepareExecuteParams } from '@canton-network/core-wallet-dapp-remote-rpc-client'
import { LedgerApiParams } from '@canton-network/core-wallet-dapp-rpc-client'
export * from '@canton-network/core-splice-provider'

const injectProvider = ({ walletType, url }: DiscoverResult) => {
    if (walletType === 'remote') {
        return injectSpliceProvider(
            ProviderType.HTTP,
            new URL(url),
            storage.getKernelSession()?.sessionToken
        )
    } else {
        return injectSpliceProvider(ProviderType.WINDOW)
    }
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectProvider(discovery)

const openKernelUserUI = (
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

export enum ErrorCode {
    UserCancelled,
    Timeout,
    Other,
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export async function open(): Promise<void> {
    const discovery = storage.getKernelDiscovery()
    if (!discovery) {
        throw new Error('No previous discovery found')
    }

    const session = storage.getKernelSession()
    if (!session) {
        throw new Error('No previous session found')
    }

    openKernelUserUI(discovery.walletType, session.userUrl ?? '')
}

export async function connect(): Promise<dappAPI.ConnectResult> {
    return discover()
        .then(async (result) => {
            // Store discovery result and remove previous session
            storage.setKernelDiscovery(result)
            storage.removeKernelSession()
            const provider = injectProvider(result)

            const response = await dappController(provider).connect()

            if (!response.isConnected) {
                // TODO: error dialog
                console.error('SDK: Not connected', response)
                // openKernelUserUI(result.walletType, response.userUrl)
            } else {
                console.log('SDK: Store connection', response)
                storage.setKernelSession(response)
            }

            return response
        })
        .catch((err) => {
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details: err instanceof Error ? err.message : String(err),
            } as ConnectError
        })
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
