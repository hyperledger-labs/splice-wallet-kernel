// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { removeKernelDiscovery, removeKernelSession } from './storage'
import { gatewayUi } from './ui'

export const clearAllLocalState = () => {
    window.canton = undefined // Clear global canton provider

    removeKernelSession()
    removeKernelDiscovery()
    gatewayUi.close()
}
