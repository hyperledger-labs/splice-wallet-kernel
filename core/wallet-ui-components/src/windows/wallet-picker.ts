// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    WalletPickerEntry,
    WalletPickerResult,
} from '../components/wallet-picker.js'
import { WalletPicker } from '../components/wallet-picker.js'
import { popup } from './popup.js'

/**
 * Opens a wallet picker popup and resolves with the user's selection.
 *
 * Wallet entries are passed via localStorage and the user's choice is
 * communicated back via postMessage.
 */
export async function pickWallet(
    entries: WalletPickerEntry[]
): Promise<WalletPickerResult> {
    localStorage.setItem(
        'splice_wallet_picker_entries',
        JSON.stringify(entries)
    )

    const win = popup.open(WalletPicker, {
        title: 'Connect a wallet',
    })

    return new Promise<WalletPickerResult>((resolve, reject) => {
        let result: WalletPickerResult | undefined = undefined

        win.addEventListener('beforeunload', () => {
            if (result === undefined) {
                reject(new Error('User closed the wallet picker'))
            }
        })

        const handler = (event: MessageEvent) => {
            if (
                event.origin === window.location.origin &&
                event.data?.messageType === 'SPLICE_WALLET_PICKER_RESULT'
            ) {
                result = {
                    providerId: event.data.providerId,
                    name: event.data.name,
                    type: event.data.walletType,
                    url: event.data.url,
                    reuseGlobalWalletPopup: event.data.reuseGlobalWalletPopup,
                }
                window.removeEventListener('message', handler)
                resolve(result)
                // HTTP wallet gateway reuses this named popup after async connect
                // (see RemoteAdapter.reuseGlobalWalletPopup). Closing would force a
                // second window.open without user activation. Other wallets must close
                // or the picker UI would stay visible (e.g. Loop, browser extension).
                if (!result.reuseGlobalWalletPopup) {
                    queueMicrotask(() => {
                        if (!win.closed) {
                            try {
                                win.close()
                            } catch {
                                // ignore
                            }
                        }
                    })
                }
            }
        }

        window.addEventListener('message', handler)
    })
}
