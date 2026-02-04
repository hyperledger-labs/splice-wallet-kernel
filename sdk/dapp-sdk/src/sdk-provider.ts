// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DappProvider,
    DappRemoteProvider,
    ProviderType,
    ProviderV2,
    EventListener,
} from '@canton-network/core-splice-provider'
import { DiscoverResult } from '@canton-network/core-types'
import {
    RpcTypes as DappRpcTypes,
    Session,
    LedgerApiParams,
    PrepareExecuteParams,
} from '@canton-network/core-wallet-dapp-rpc-client'

import { dappSDKController } from './sdk-controller'

type ProviderClient =
    | {
          type: ProviderType.HTTP
          instance: DappRemoteProvider
      }
    | {
          type: ProviderType.WINDOW
          instance: DappProvider
      }

export class DappSDKProvider implements ProviderV2<DappRpcTypes> {
    private provider: ProviderClient

    constructor({ walletType, url }: DiscoverResult, session?: Session) {
        if (walletType == 'extension') {
            this.provider = {
                type: ProviderType.WINDOW,
                instance: new DappProvider(),
            }
        } else if (walletType == 'remote') {
            this.provider = {
                type: ProviderType.HTTP,
                instance: new DappRemoteProvider(
                    new URL(url),
                    session?.accessToken
                ),
            }
        } else {
            throw new Error(`Unsupported wallet type ${walletType}`)
        }
    }

    request<M extends keyof DappRpcTypes>(args: {
        method: M
        params: DappRpcTypes[M]['params']
    }): Promise<DappRpcTypes[M]['result']> {
        if (this.provider.type === ProviderType.WINDOW)
            return this.provider.instance.request(args)

        const controller = dappSDKController(this.provider.instance)
        switch (args.method) {
            case 'status':
                return controller.status()
            case 'connect':
                return controller.connect()
            case 'disconnect':
                return controller.disconnect()
            case 'ledgerApi':
                return controller.ledgerApi(args.params as LedgerApiParams)
            case 'prepareExecute':
                return controller.prepareExecute(
                    args.params as PrepareExecuteParams
                )
            case 'listAccounts':
                return controller.listAccounts()
            case 'prepareExecuteAndWait':
                return controller.prepareExecuteAndWait(
                    args.params as PrepareExecuteParams
                )
            default:
                throw new Error('Unsupported method')
        }
    }

    on<E>(event: string, listener: EventListener<E>): ProviderV2<DappRpcTypes> {
        return this.provider.instance.on(
            event,
            listener
        ) as ProviderV2<DappRpcTypes>
    }

    emit<E>(event: string, ...args: E[]): boolean {
        return this.provider.instance.emit(event, args)
    }

    removeListener<E>(
        event: string,
        listenerToRemove: EventListener<E>
    ): ProviderV2<DappRpcTypes> {
        return this.provider.instance.removeListener(
            event,
            listenerToRemove
        ) as ProviderV2<DappRpcTypes>
    }
}
