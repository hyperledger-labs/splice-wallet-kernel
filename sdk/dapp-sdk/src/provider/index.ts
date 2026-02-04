// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult } from '@canton-network/core-types'
import { injectProvider as ip } from '@canton-network/core-splice-provider'
import * as storage from '../storage'
import { DappSDKProvider } from '../sdk-provider'

export const injectProvider = (discovery: DiscoverResult) => {
    return ip(
        new DappSDKProvider(discovery, storage.getKernelSession()?.session)
    )
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectProvider(discovery)
