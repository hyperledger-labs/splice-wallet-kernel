// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    CANTON_ANNOUNCE_PROVIDER_EVENT,
    CANTON_REQUEST_PROVIDER_EVENT,
} from '@canton-network/core-types'
import { browser } from 'wxt/browser'
import { WALLET_NAME } from '@/shared/brand'

/**
 * This function announces the Wallet Extension to the dApp page, via EIP-6963
 */
export function announceSelf() {
    const runtimeId = browser.runtime?.id

    window.addEventListener(CANTON_REQUEST_PROVIDER_EVENT, () => {
        if (!runtimeId) return
        window.dispatchEvent(
            new CustomEvent(CANTON_ANNOUNCE_PROVIDER_EVENT, {
                detail: {
                    id: runtimeId,
                    name: WALLET_NAME,
                    target: runtimeId,
                },
            })
        )
    })
}
