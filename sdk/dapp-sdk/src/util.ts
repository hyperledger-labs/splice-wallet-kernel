// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { popup } from '@canton-network/core-wallet-ui-components'
import { removeKernelDiscovery, removeKernelSession } from './storage'

export const clearAllLocalState = ({
    closePopup,
}: { closePopup?: boolean } = {}) => {
    window.canton = undefined // Clear global canton provider

    removeKernelSession()
    removeKernelDiscovery()
    if (closePopup) {
        popup.close()
    }
}
