// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DappAsyncProvider } from '@canton-network/core-splice-provider'
import buildController from './dapp-api/rpc-gen'
import {
    ConnectResult,
    LedgerApiParams,
    Network,
    PrepareExecuteAndWaitResult,
    PrepareExecuteParams,
    SignMessageResult,
    Wallet,
} from './dapp-api/rpc-gen/typings'
import { ErrorCode } from './error'
import { popup } from '@canton-network/core-wallet-ui-components'
import * as dappAsyncAPI from '@canton-network/core-wallet-dapp-remote-rpc-client'

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

export const dappSDKController = (provider: DappAsyncProvider) =>
    buildController({
        connect: async (): Promise<ConnectResult> => {
            const response = await provider.request({
                method: 'connect',
            })

            if (response.session) {
                return response
            } else {
                popup.open(response.userUrl ?? '')
                const promise = new Promise<ConnectResult>(
                    (resolve, reject) => {
                        // 5 minutes timeout
                        const timeout = withTimeout(
                            reject,
                            'Timeout waiting for connection',
                            5 * 60 * 1000
                        )
                        provider.on<dappAsyncAPI.StatusEvent>(
                            'statusChanged',
                            (event) => {
                                if (event.connection.isConnected) {
                                    clearTimeout(timeout)
                                    resolve(event.connection)
                                }
                            }
                        )
                    }
                )

                return promise
            }
        },
        disconnect: async () => {
            return await provider.request({
                method: 'disconnect',
            })
        },
        ledgerApi: async (params: LedgerApiParams) =>
            provider.request({
                method: 'ledgerApi',
                params,
            }),
        prepareExecute: async (params: PrepareExecuteParams) => {
            const response = await provider.request({
                method: 'prepareExecute',
                params,
            })

            if (response.userUrl) popup.open(response.userUrl)

            return null
        },
        prepareExecuteAndWait: async (
            params: PrepareExecuteParams
        ): Promise<PrepareExecuteAndWaitResult> => {
            const response = await provider.request({
                method: 'prepareExecute',
                params,
            })

            if (response.userUrl) popup.open(response.userUrl)

            const promise = new Promise<PrepareExecuteAndWaitResult>(
                (resolve, reject) => {
                    const timeout = withTimeout(
                        reject,
                        'Timed out waiting for transaction approval'
                    )

                    // TODO: ensure that the event corresponds to the correct transaction
                    const listener = (event: dappAsyncAPI.TxChangedEvent) => {
                        if (event.status === 'failed') {
                            provider.removeListener('txChanged', listener)
                            clearTimeout(timeout)
                            reject({
                                status: 'error',
                                error: ErrorCode.TransactionFailed,
                                details: `Transaction with commandId ${event.commandId} failed to execute.`,
                            })
                        }
                        if (event.status === 'executed') {
                            provider.removeListener('txChanged', listener)
                            clearTimeout(timeout)
                            resolve({
                                tx: event,
                            })
                        }
                    }

                    provider.on<dappAsyncAPI.TxChangedEvent>(
                        'txChanged',
                        listener
                    )
                }
            )

            return promise
        },
        status: async () => {
            return provider.request({ method: 'status' })
        },
        listAccounts: async () =>
            provider.request({
                method: 'listAccounts',
            }),
        accountsChanged: async () => {
            throw new Error('Only for events.')
        },
        txChanged: async () => {
            throw new Error('Only for events.')
        },
        getActiveNetwork: function (): Promise<Network> {
            throw new Error('Function not implemented.')
        },
        signMessage: function (): Promise<SignMessageResult> {
            throw new Error('Function not implemented.')
        },
        getPrimaryAccount: function (): Promise<Wallet> {
            return provider.request({
                method: 'getPrimaryAccount',
            })
        },
    })
