// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DiscoverResult,
    SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import { popupHref } from '@canton-network/core-wallet-ui-components'

class GatewayUi {
    private popup: WindowProxy | undefined = undefined

    constructor() {
        // close the existing popup if the main window is closed (or refreshed)
        window.addEventListener('beforeunload', () => {
            this.close()
        })
    }

    open(
        walletType: DiscoverResult['walletType'],
        userUrl: string
    ): WindowProxy | undefined {
        switch (walletType) {
            case 'remote':
                // Focus the existing popup if it's already open
                popupHref(new URL(userUrl)).then((window) => {
                    this.popup = window
                })

                return this.popup
            case 'extension': {
                const msg: SpliceMessage = {
                    type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                    url: userUrl,
                }
                window.postMessage(msg, '*')
            }
        }
    }

    close() {
        if (this.popup) this.popup.close()
        this.popup = undefined
    }
}

// create singleton instance
// note: we do not re-export this in index.ts, as it is for private SDK use.
// Consumers should still use `sdk.open()` and `sdk.disconnect()`
export const gatewayUi = new GatewayUi()
