// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { browser, type Browser } from 'wxt/browser'
import { logger } from '@/shared/logger'
import { vaultMessenger } from '@/shared/vault-protocol'
import type { Vault } from './vault'

/** The extension pages that may use the vault service. */
const TRUSTED_PAGES = new Set(['/popup.html', '/app.html'])

const log = logger.getChild('vault')

type Sender = Pick<Browser.runtime.MessageSender, 'id' | 'url'>

/**
 * Whether a message comes from the extension's popup or app page. Content
 * scripts share the extension's ID, so the URL decides; its hash and query
 * don't matter. `sender.tab` doesn't help, since app.html opens in a tab.
 */
export function isTrustedSender(sender: Sender): boolean {
    if (sender.id !== browser.runtime.id || sender.url === undefined) {
        return false
    }
    let url: URL
    try {
        url = new URL(sender.url)
    } catch {
        return false
    }
    // Compare protocol and host, not `origin`: the URL standard gives
    // non-web schemes an opaque origin ("null"), which every such URL shares.
    const extension = new URL(browser.runtime.getURL('/'))
    return (
        url.protocol === extension.protocol &&
        url.host === extension.host &&
        TRUSTED_PAGES.has(url.pathname)
    )
}

/**
 * Answers the vault messages of the extension pages. Must be called
 * synchronously during background start-up, so a message that wakes the
 * service worker is handled. Passwords are never logged.
 */
export function registerVaultService(vault: Vault): void {
    function assertTrusted(type: string, sender: Sender): void {
        if (isTrustedSender(sender)) return
        log.warn('Refused {type} from an untrusted sender', { type })
        throw new Error(`${type} is only for the extension pages.`)
    }

    vaultMessenger.onMessage('vault.getStatus', async ({ type, sender }) => {
        assertTrusted(type, sender)
        // Right after a background start, the status is only reliable once
        // the restore has finished.
        await vault.ready
        return vault.status()
    })
    vaultMessenger.onMessage('vault.create', async ({ type, sender, data }) => {
        assertTrusted(type, sender)
        await vault.create(data.password)
    })
    vaultMessenger.onMessage('vault.unlock', async ({ type, sender, data }) => {
        assertTrusted(type, sender)
        await vault.unlock(data.password)
    })
    vaultMessenger.onMessage('vault.lock', async ({ type, sender }) => {
        assertTrusted(type, sender)
        await vault.lock()
    })
}
