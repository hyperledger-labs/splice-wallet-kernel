// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { EndpointSpec } from '../types'
import { rpcCall } from '../rpc'

interface BuildArgs {
    baseUrl: string
    dappPath: string
    runId: string
}

export function buildDappApiEndpoints({
    baseUrl,
    dappPath,
    runId,
}: BuildArgs): EndpointSpec[] {
    const url = `${baseUrl}${dappPath}`
    const commandId = __ENV.COMMAND_ID ?? `perf-${runId}`

    return [
        {
            name: 'dapp.status',
            group: 'dappApi',
            path: dappPath,
            method: 'POST',
            tags: { endpoint: 'dapp.status', endpoint_group: 'dappApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'status',
                    endpointGroup: 'dappApi',
                    endpointName: 'dapp.status',
                    runId,
                }),
        },
        {
            name: 'dapp.connect',
            group: 'dappApi',
            path: dappPath,
            method: 'POST',
            tags: { endpoint: 'dapp.connect', endpoint_group: 'dappApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'connect',
                    endpointGroup: 'dappApi',
                    endpointName: 'dapp.connect',
                    runId,
                }),
        },
        {
            name: 'dapp.getActiveNetwork',
            group: 'dappApi',
            path: dappPath,
            method: 'POST',
            tags: {
                endpoint: 'dapp.getActiveNetwork',
                endpoint_group: 'dappApi',
            },
            execute: () =>
                rpcCall({
                    url,
                    method: 'getActiveNetwork',
                    endpointGroup: 'dappApi',
                    endpointName: 'dapp.getActiveNetwork',
                    runId,
                }),
        },
        {
            name: 'dapp.listAccounts',
            group: 'dappApi',
            path: dappPath,
            method: 'POST',
            tags: { endpoint: 'dapp.listAccounts', endpoint_group: 'dappApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'listAccounts',
                    endpointGroup: 'dappApi',
                    endpointName: 'dapp.listAccounts',
                    runId,
                }),
        },
        {
            name: 'dapp.getPrimaryAccount',
            group: 'dappApi',
            path: dappPath,
            method: 'POST',
            tags: {
                endpoint: 'dapp.getPrimaryAccount',
                endpoint_group: 'dappApi',
            },
            execute: () =>
                rpcCall({
                    url,
                    method: 'getPrimaryAccount',
                    endpointGroup: 'dappApi',
                    endpointName: 'dapp.getPrimaryAccount',
                    runId,
                }),
        },
        {
            name: 'dapp.disconnect',
            group: 'dappApi',
            path: dappPath,
            method: 'POST',
            tags: { endpoint: 'dapp.disconnect', endpoint_group: 'dappApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'disconnect',
                    endpointGroup: 'dappApi',
                    endpointName: 'dapp.disconnect',
                    runId,
                }),
        },
        ...(__ENV.INCLUDE_MUTATING_DAPP_API === '1'
            ? [
                  {
                      name: 'dapp.prepareExecute',
                      group: 'dappApi' as const,
                      path: dappPath,
                      method: 'POST' as const,
                      tags: {
                          endpoint: 'dapp.prepareExecute',
                          endpoint_group: 'dappApi',
                      },
                      execute: () =>
                          rpcCall({
                              url,
                              method: 'prepareExecute',
                              params: {
                                  preparedTransaction: '',
                                  preparedTransactionHash: '',
                                  commandId,
                              },
                              endpointGroup: 'dappApi',
                              endpointName: 'dapp.prepareExecute',
                              runId,
                          }),
                  },
                  {
                      name: 'dapp.signMessage',
                      group: 'dappApi' as const,
                      path: dappPath,
                      method: 'POST' as const,
                      tags: {
                          endpoint: 'dapp.signMessage',
                          endpoint_group: 'dappApi',
                      },
                      execute: () =>
                          rpcCall({
                              url,
                              method: 'signMessage',
                              params: { message: `perf-${runId}` },
                              endpointGroup: 'dappApi',
                              endpointName: 'dapp.signMessage',
                              runId,
                          }),
                  },
              ]
            : []),
    ]
}
