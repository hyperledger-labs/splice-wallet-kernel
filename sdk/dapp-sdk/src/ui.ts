// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DiscoverResult,
    SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import { popupHref } from '@canton-network/core-wallet-ui-components'

type GatewayUiConfig = {
    walletType: DiscoverResult['walletType']
    userUrl: string
}

class GatewayUi {
    private identifier: string = 'splice_wallet_gateway_popup'
    private popup: WindowProxy | undefined = undefined
    private current: GatewayUiConfig | undefined = undefined

    open(
        walletType: DiscoverResult['walletType'],
        userUrl: string
    ): WindowProxy | undefined {
        // Force a new open if the wallet type or URL has changed
        if (
            walletType !== this.current?.walletType ||
            userUrl !== this.current?.userUrl
        ) {
            this.current = { walletType, userUrl }
            this.close()
        }

        switch (walletType) {
            case 'remote':
                // Focus the existing popup if it's already open
                if (this.popup === undefined || this.popup.closed) {
                    popupHref(new URL(userUrl), {
                        target: this.identifier,
                    }).then((window) => {
                        this.popup = window
                    })
                } else {
                    this.popup.focus()
                }
                return this.popup
                break
            case 'extension': {
                const msg: SpliceMessage = {
                    type: WalletEvent.SPLICE_WALLET_EXT_OPEN,
                    url: userUrl,
                }
                window.postMessage(msg, '*')
                break
            }
        }
    }

    close() {
        if (this.popup) {
            this.popup.close()
        } else {
            // If the page was refreshed, the popup may still be open, but the WindowProxy
            // reference is lost. Attempt to close it by grabbing a new handle and closing immediately.
            const existing = window.open(
                '',
                this.identifier,
                'popup width=100,height=100'
            )

            if (existing && !existing.closed) {
                existing.close()
            }
        }

        this.popup = undefined
    }
}

// create singleton instance
// note: we do not re-export this in index.ts, as it is for private SDK use.
// Consumers should still use `sdk.open()` and `sdk.disconnect()`
export const gatewayUi = new GatewayUi()
