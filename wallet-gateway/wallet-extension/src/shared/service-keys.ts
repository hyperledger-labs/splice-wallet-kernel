// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ProxyServiceKey } from '@webext-core/proxy-service'
import type { DappDispatcher } from '@/background/controllers/dapp/dispatch'
import type { Methods as UserRpcMethods } from '@/background/controllers/user/rpc-gen'

/** The user API, called by the extension pages. */
export const USER_RPC_KEY =
    'user-rpc-service' as ProxyServiceKey<UserRpcMethods>

/** The dApp API dispatcher, called by the content script. */
export const DAPP_RPC_KEY =
    'dapp-rpc-service' as ProxyServiceKey<DappDispatcher>
