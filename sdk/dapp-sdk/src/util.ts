// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { closeKernelUserUI } from './provider'
import { removeKernelDiscovery, removeKernelSession } from './storage'

export const clearAllLocalState = () => {
    window.canton = undefined // Clear global canton provider

    removeKernelSession()
    removeKernelDiscovery()
    closeKernelUserUI()
}
