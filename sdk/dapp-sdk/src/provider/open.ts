// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as storage from '../storage'
import { popup } from '@canton-network/core-wallet-ui-components'
import { SpliceMessage, WalletEvent } from '@canton-network/core-types'

export async function open(): Promise<void> {
    const discovery = storage.getKernelDiscovery()
    if (!discovery) {
        throw new Error('No previous discovery found')
    }

    const session = storage.getKernelSession()
    if (!session) {
        throw new Error('No previous session found')
    }

    const userUrl = session.userUrl ?? ''

    if (discovery.walletType === 'remote') {
        popup.open(userUrl)
    } else if (discovery.walletType === 'extension') {
        const msg: SpliceMessage = {
            type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
            url: userUrl,
        }
        window.postMessage(msg, '*')
    }
}
