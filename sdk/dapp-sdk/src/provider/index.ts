// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult } from '@canton-network/core-types'
import { injectProvider } from '@canton-network/core-provider-dapp'
import * as storage from '../storage'
import { DappSDKProvider } from '../sdk-provider'

export const injectSdkProvider = (discovery: DiscoverResult) => {
    return injectProvider(
        new DappSDKProvider(discovery, storage.getKernelSession()?.session)
    )
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectSdkProvider(discovery)
