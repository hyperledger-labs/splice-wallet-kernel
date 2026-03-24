// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { EndpointSpec } from '../types'
import { rpcCall } from '../rpc'

interface BuildArgs {
    baseUrl: string
    userPath: string
    runId: string
}

export function buildUserApiEndpoints({
    baseUrl,
    userPath,
    runId,
}: BuildArgs): EndpointSpec[] {
    const url = `${baseUrl}${userPath}`
    const networkId = __ENV.NETWORK_ID ?? 'localnet'
    const partyId = __ENV.PARTY_ID ?? 'Alice::1220deadbeef'
    const commandId = __ENV.COMMAND_ID ?? `perf-${runId}`

    return [
        {
            name: 'user.getUser',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.getUser', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'getUser',
                    endpointGroup: 'userApi',
                    endpointName: 'user.getUser',
                    runId,
                }),
        },
        {
            name: 'user.listNetworks',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.listNetworks', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'listNetworks',
                    endpointGroup: 'userApi',
                    endpointName: 'user.listNetworks',
                    runId,
                }),
        },
        {
            name: 'user.listIdps',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.listIdps', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'listIdps',
                    endpointGroup: 'userApi',
                    endpointName: 'user.listIdps',
                    runId,
                }),
        },
        {
            name: 'user.addSession',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.addSession', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'addSession',
                    params: { networkId },
                    endpointGroup: 'userApi',
                    endpointName: 'user.addSession',
                    runId,
                }),
        },
        {
            name: 'user.listSessions',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.listSessions', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'listSessions',
                    endpointGroup: 'userApi',
                    endpointName: 'user.listSessions',
                    runId,
                }),
        },
        {
            name: 'user.listWallets',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.listWallets', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'listWallets',
                    params: { filter: {} },
                    endpointGroup: 'userApi',
                    endpointName: 'user.listWallets',
                    runId,
                }),
        },
        {
            name: 'user.syncWallets',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: { endpoint: 'user.syncWallets', endpoint_group: 'userApi' },
            execute: () =>
                rpcCall({
                    url,
                    method: 'syncWallets',
                    endpointGroup: 'userApi',
                    endpointName: 'user.syncWallets',
                    runId,
                }),
        },
        {
            name: 'user.isWalletSyncNeeded',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: {
                endpoint: 'user.isWalletSyncNeeded',
                endpoint_group: 'userApi',
            },
            execute: () =>
                rpcCall({
                    url,
                    method: 'isWalletSyncNeeded',
                    endpointGroup: 'userApi',
                    endpointName: 'user.isWalletSyncNeeded',
                    runId,
                }),
        },
        {
            name: 'user.getTransaction',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: {
                endpoint: 'user.getTransaction',
                endpoint_group: 'userApi',
            },
            execute: () =>
                rpcCall({
                    url,
                    method: 'getTransaction',
                    params: { commandId },
                    endpointGroup: 'userApi',
                    endpointName: 'user.getTransaction',
                    runId,
                }),
        },
        {
            name: 'user.listTransactions',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: {
                endpoint: 'user.listTransactions',
                endpoint_group: 'userApi',
            },
            execute: () =>
                rpcCall({
                    url,
                    method: 'listTransactions',
                    endpointGroup: 'userApi',
                    endpointName: 'user.listTransactions',
                    runId,
                }),
        },
        {
            name: 'user.deleteTransaction',
            group: 'userApi',
            path: userPath,
            method: 'POST',
            tags: {
                endpoint: 'user.deleteTransaction',
                endpoint_group: 'userApi',
            },
            execute: () =>
                rpcCall({
                    url,
                    method: 'deleteTransaction',
                    params: { commandId },
                    endpointGroup: 'userApi',
                    endpointName: 'user.deleteTransaction',
                    runId,
                }),
        },
        // Mutating/admin-heavy methods are optional to keep default runs safe.
        ...(__ENV.INCLUDE_MUTATING_USER_API === '1'
            ? [
                  {
                      name: 'user.setPrimaryWallet',
                      group: 'userApi' as const,
                      path: userPath,
                      method: 'POST' as const,
                      tags: {
                          endpoint: 'user.setPrimaryWallet',
                          endpoint_group: 'userApi',
                      },
                      execute: () =>
                          rpcCall({
                              url,
                              method: 'setPrimaryWallet',
                              params: { partyId },
                              endpointGroup: 'userApi',
                              endpointName: 'user.setPrimaryWallet',
                              runId,
                          }),
                  },
              ]
            : []),
    ]
}
