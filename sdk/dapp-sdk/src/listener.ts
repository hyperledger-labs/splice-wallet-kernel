// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { onStatusChanged } from './provider/events.js'
import { clearAllLocalState } from './util.js'
import { WalletEvent } from '@canton-network/core-types'

if (window.canton) {
    // Clean up session on disconnect
    onStatusChanged(async (event) => {
        if (!event.isConnected) {
            clearAllLocalState({ closePopup: true })
        }
    })
    // Clean up session on logout message
    window.addEventListener('message', (event: MessageEvent) => {
        if (event.data?.type === WalletEvent.SPLICE_WALLET_LOGOUT) {
            clearAllLocalState({ closePopup: true })
        }
    })
}
