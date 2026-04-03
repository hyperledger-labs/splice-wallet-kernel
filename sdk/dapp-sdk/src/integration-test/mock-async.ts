// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { RequestArgs } from '@canton-network/core-types'
import { AbstractProvider } from '@canton-network/core-splice-provider'
import type {
    ConnectResult,
    LedgerApiParams,
    LedgerApiResult,
    ListAccountsResult,
    Network,
    PrepareExecuteAndWaitResult,
    PrepareExecuteParams,
    RpcTypes as DappRpcTypes,
    SignMessageParams,
    SignMessageResult,
    StatusEvent,
    Wallet,
} from '@canton-network/core-wallet-dapp-rpc-client'

const MOCK_PROVIDER_ID = 'mock-async'

export class MockAsync extends AbstractProvider<DappRpcTypes> {
    private readonly baseConnection: ConnectResult = {
        isConnected: true,
        isNetworkConnected: true,
        userUrl: 'https://wallet.test.invalid/ui',
    }

    private readonly baseStatus: StatusEvent = {
        provider: {
            id: MOCK_PROVIDER_ID,
            providerType: 'browser',
            userUrl: 'https://wallet.test.invalid/ui',
        },
        connection: this.baseConnection,
        network: {
            networkId: 'mock-network',
            ledgerApi: 'https://ledger.test.invalid',
            accessToken: 'mock-access-token',
        },
        session: {
            accessToken: 'mock-access-token',
            userId: 'mock-user',
        },
    }

    private readonly primaryWallet: Wallet = {
        primary: true,
        partyId: 'MockParty::123',
        status: 'allocated',
        hint: 'mock',
        publicKey: 'mock-pk',
        namespace: 'mock',
        networkId: 'mock-network',
        signingProviderId: 'mock-signing',
    }

    async request<M extends keyof DappRpcTypes>(
        args: RequestArgs<DappRpcTypes, M>
    ): Promise<DappRpcTypes[M]['result']> {
        switch (args.method) {
            case 'status':
                return this.baseStatus as DappRpcTypes[M]['result']
            case 'connect':
                return Promise.resolve(this.baseConnection) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'disconnect':
                return Promise.resolve(null) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'listAccounts':
                return Promise.resolve([
                    this.primaryWallet,
                ] as ListAccountsResult) as Promise<DappRpcTypes[M]['result']>
            case 'getPrimaryAccount':
                return Promise.resolve(this.primaryWallet) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'getActiveNetwork':
                return Promise.resolve(
                    this.baseStatus.network as Network
                ) as Promise<DappRpcTypes[M]['result']>
            case 'signMessage': {
                const params = (
                    args as RequestArgs<DappRpcTypes, 'signMessage'>
                ).params as SignMessageParams
                const out: SignMessageResult = {
                    signature: `signed:${params.message}`,
                }
                return Promise.resolve(out) as Promise<
                    DappRpcTypes[M]['result']
                >
            }
            case 'prepareExecute':
                return Promise.resolve(null) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'prepareExecuteAndWait': {
                const params = (
                    args as RequestArgs<DappRpcTypes, 'prepareExecuteAndWait'>
                ).params as PrepareExecuteParams
                const cmd = params.commandId ?? 'mock-command'
                const out: PrepareExecuteAndWaitResult = {
                    tx: {
                        status: 'executed',
                        commandId: cmd,
                        payload: {
                            updateId: 'mock-update',
                            completionOffset: 0,
                        },
                    },
                }
                return Promise.resolve(out) as Promise<
                    DappRpcTypes[M]['result']
                >
            }
            case 'ledgerApi': {
                const params = (args as RequestArgs<DappRpcTypes, 'ledgerApi'>)
                    .params as LedgerApiParams
                const out: LedgerApiResult = {
                    mocked: true,
                    resource: params.resource,
                }
                return Promise.resolve(out) as Promise<
                    DappRpcTypes[M]['result']
                >
            }
            case 'accountsChanged':
            case 'txChanged':
                throw new Error(`Not implemented`)
            default:
                throw new Error(
                    `Unhandled method: ${(args as { method: string }).method}`
                )
        }
    }
}
