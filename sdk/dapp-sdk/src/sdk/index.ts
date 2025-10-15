// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult } from '@canton-network/core-types'
import { Provider } from '../provider'
import { injectSpliceProvider } from '@canton-network/core-splice-provider'
import * as storage from '../storage'

export const injectProvider = (discovery: DiscoverResult) => {
    return injectSpliceProvider(
        new Provider(discovery, storage.getKernelSession()?.sessionToken)
    )
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectProvider(discovery)
