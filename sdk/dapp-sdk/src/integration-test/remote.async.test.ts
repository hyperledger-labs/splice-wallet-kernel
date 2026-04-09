// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DappSDK } from '../sdk'
import { RemoteAdapter } from '../adapter/remote-adapter'
import { popup } from '@canton-network/core-wallet-ui-components'
import { installMockRemoteIdpPostMessage } from './remote-test-helpers'
import { MOCK_DAPP_API_PATH } from './mock-remote-gateway/json-rpc-handlers'

const REMOTE_URL =
    (import.meta as ImportMeta & { env: { VITE_MOCK_REMOTE_URL?: string } }).env
        .VITE_MOCK_REMOTE_URL ?? 'http://127.0.0.1:13030'

describe('dApp SDK (async / remote gateway)', () => {
    let restoreFetch: (() => void) | undefined

    beforeEach(() => {
        localStorage.clear()
        delete (window as Window & { canton?: unknown }).canton
        vi.spyOn(popup, 'open').mockImplementation(() => undefined)
        vi.spyOn(popup, 'close').mockImplementation(() => undefined)
        restoreFetch = installMockRemoteIdpPostMessage()
    })

    afterEach(() => {
        restoreFetch?.()
        vi.restoreAllMocks()
    })

    it('connects over HTTP + SSE and sets window.canton', async () => {
        const remote = new RemoteAdapter({
            name: 'integration remote gateway',
            rpcUrl: REMOTE_URL + MOCK_DAPP_API_PATH,
            providerId: 'remote:integration',
        })

        const sdk = new DappSDK({
            walletPicker: async (entries) => {
                const entry = entries.find(
                    (e) => e.providerId === 'remote:integration'
                )
                if (!entry) {
                    throw new Error(
                        `remote adapter missing; got ${entries.map((e) => e.providerId).join(',')}`
                    )
                }
                return {
                    providerId: entry.providerId,
                    name: entry.name,
                    type: entry.type,
                }
            },
        })

        expect(window.canton).toBeUndefined()

        await sdk.connect({
            defaultAdapters: [remote],
        })

        expect(window.canton).toBeDefined()
        expect(window.canton).toBe(sdk.getConnectedProvider())

        const accounts = await sdk.listAccounts()
        expect(accounts[0]?.partyId).toBe('RemoteParty::1')

        await sdk.disconnect()
    })
})
