// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DappProvider, Provider } from '@canton-network/core-splice-provider'
import type { RpcTypes as DappRpcTypes } from '@canton-network/core-wallet-dapp-rpc-client'
import { WalletEvent } from '@canton-network/core-types'
import type { ProviderAdapter, WalletInfo, WalletType, WalletId } from './types'
import { toWalletId } from './types'

const EXTENSION_WALLET_ID = toWalletId('extension')
const EXTENSION_DETECT_TIMEOUT_MS = 2000

/**
 * Adapter for the Splice Wallet browser extension.
 *
 * createProvider() returns a DappProvider which communicates via postMessage
 * and implements the full openrpc-dapp-api.json surface directly.
 */
export class ExtensionAdapter implements ProviderAdapter {
    readonly walletId: WalletId = EXTENSION_WALLET_ID
    readonly name = 'Browser Extension'
    readonly type: WalletType = 'extension'
    readonly icon: string | undefined = undefined

    getInfo(): WalletInfo {
        return {
            walletId: this.walletId,
            name: this.name,
            type: this.type,
            description: 'Connect via the Splice Wallet browser extension',
        }
    }

    async detect(): Promise<boolean> {
        if (window.canton) return true

        return new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
                window.removeEventListener('message', handler)
                resolve(false)
            }, EXTENSION_DETECT_TIMEOUT_MS)

            const handler = (event: MessageEvent) => {
                if (event.data?.type === WalletEvent.SPLICE_WALLET_EXT_ACK) {
                    clearTimeout(timeout)
                    window.removeEventListener('message', handler)
                    resolve(true)
                }
            }

            window.addEventListener('message', handler)
            window.postMessage(
                { type: WalletEvent.SPLICE_WALLET_EXT_READY },
                '*'
            )
        })
    }

    createProvider(): Provider<DappRpcTypes> {
        return new DappProvider() as Provider<DappRpcTypes>
    }

    teardown(): void {
        // No cleanup needed for extensions
    }

    async restore(): Promise<Provider<DappRpcTypes> | null> {
        if (!window.canton) return null

        try {
            const provider = new DappProvider()
            const status = await provider.request({ method: 'status' })
            if (status.connection.isConnected) {
                return provider as Provider<DappRpcTypes>
            }
        } catch {
            // Restore failed
        }
        return null
    }
}
