// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    EventListener,
    Provider,
} from '@canton-network/core-splice-provider'
import type { RequestArgs } from '@canton-network/core-types'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import { popup } from '@canton-network/core-wallet-ui-components'
import type {
    ProviderAdapter,
    WalletInfo,
} from '@canton-network/core-wallet-discovery'
import type {
    ProviderId,
    ProviderType,
} from '@canton-network/core-wallet-dapp-rpc-client'
import * as storage from '../storage'
import type { StatusEvent } from '@canton-network/core-wallet-dapp-remote-rpc-client'
import { clearAllLocalState } from '../util'
import { WalletEvent } from '@canton-network/core-types'
import { DappAsyncProvider } from '@canton-network/core-provider-dapp'
import { dappSDKController } from '../sdk-controller'

export interface RemoteAdapterConfig {
    providerId?: string | undefined
    name: string
    rpcUrl: string
    icon?: string | undefined
    description?: string | undefined
}

/**
 * ProviderAdapter for any CIP-103 compliant wallet reachable over HTTP/SSE.
 *
 * provider() returns a provider that maps the remote API
 * (openrpc-dapp-remote-api.json) to the dApp API
 * (openrpc-dapp-api.json) via dappSDKController.
 */
export class RemoteAdapter implements ProviderAdapter {
    readonly providerId: ProviderId
    readonly name: string
    readonly type: ProviderType = 'remote'
    readonly icon: string | undefined
    readonly rpcUrl: string
    private _provider: Provider<DappRpcTypes> | undefined
    private description: string | undefined

    constructor(config: RemoteAdapterConfig) {
        this.providerId = config.providerId ?? `remote:${config.rpcUrl}`
        this.name = config.name
        this.rpcUrl = config.rpcUrl
        this.icon = config.icon
        this.description = config.description
    }

    getInfo(): WalletInfo {
        return {
            providerId: this.providerId,
            name: this.name,
            type: this.type,
            description: this.description,
            icon: this.icon,
            url: this.rpcUrl,
        }
    }

    async detect(): Promise<boolean> {
        return true
    }

    provider(): Provider<DappRpcTypes> {
        const remoteProvider = new DappAsyncProvider(
            new URL(this.rpcUrl),
            storage.getKernelSession()?.session?.accessToken
        )
        this._provider = new RemoteMappedProvider(remoteProvider)
        this.setupSessionListeners(this._provider)
        return this._provider
    }

    teardown(): void {
        popup.close()
    }

    async restore(): Promise<Provider<DappRpcTypes> | null> {
        const discovery = storage.getKernelDiscovery()
        if (!discovery || discovery.walletType !== 'remote') return null
        if (discovery.url !== this.rpcUrl) return null

        const session = storage.getKernelSession()
        if (!session?.session) return null

        try {
            const provider = this.provider()
            const statusResult = await provider.request({ method: 'status' })
            if (statusResult.connection.isConnected) {
                return provider
            }
        } catch {
            // Session expired or invalid
        }
        return null
    }

    private setupSessionListeners(provider: Provider<DappRpcTypes>): void {
        provider.on<StatusEvent>('statusChanged', (event) => {
            console.log('statusChanged', event)
            if (event.connection.isConnected && event.session) {
                console.log('setting kernel session', event)
                storage.setKernelSession(event)
            }
        })

        provider.on<StatusEvent>('statusChanged', (event) => {
            if (!event.connection.isConnected) {
                clearAllLocalState({ closePopup: true })
            }
        })

        window.addEventListener('message', (event: MessageEvent) => {
            if (event.data?.type === WalletEvent.SPLICE_WALLET_LOGOUT) {
                clearAllLocalState({ closePopup: true })
            }
        })
    }
}

class RemoteMappedProvider implements Provider<DappRpcTypes> {
    constructor(private readonly remoteProvider: DappAsyncProvider) {}

    request<M extends keyof DappRpcTypes>(
        args: RequestArgs<DappRpcTypes, M>
    ): Promise<DappRpcTypes[M]['result']> {
        const controller = dappSDKController(this.remoteProvider)

        switch (args.method) {
            case 'status':
                return controller.status() as Promise<DappRpcTypes[M]['result']>
            case 'connect':
                return controller.connect() as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'disconnect':
                return controller.disconnect() as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'ledgerApi':
                return controller.ledgerApi(args.params) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'prepareExecute':
                return controller.prepareExecute(args.params) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'listAccounts':
                return controller.listAccounts() as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'prepareExecuteAndWait':
                return controller.prepareExecuteAndWait(args.params) as Promise<
                    DappRpcTypes[M]['result']
                >
            case 'getPrimaryAccount':
                return controller.getPrimaryAccount() as Promise<
                    DappRpcTypes[M]['result']
                >
            default:
                throw new Error('Unsupported method')
        }
    }

    on<E>(event: string, listener: EventListener<E>): Provider<DappRpcTypes> {
        this.remoteProvider.on(event, listener)
        return this
    }

    emit<E>(event: string, ...args: E[]): boolean {
        return this.remoteProvider.emit(event, ...args)
    }

    removeListener<E>(
        event: string,
        listenerToRemove: EventListener<E>
    ): Provider<DappRpcTypes> {
        this.remoteProvider.removeListener(event, listenerToRemove)
        return this
    }
}
