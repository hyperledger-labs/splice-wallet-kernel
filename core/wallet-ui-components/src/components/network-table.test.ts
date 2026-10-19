// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import './copy-button.js'
import './network-card.js'
import './network-table.js'
import { NetworkTable } from './network-table.js'
import { makePublicNetwork } from './__tests__/fixtures.js'

describe('network-table', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error and renders a card', async () => {
        const el = await fixture<NetworkTable>(
            html`<network-table
                .networks=${[makePublicNetwork()]}
            ></network-table>`
        )

        expect(el).toBeInstanceOf(NetworkTable)
        expect(el.shadowRoot!.querySelectorAll('network-card')).toHaveLength(1)
    })

    it('marks activeSession from session status, not session presence', async () => {
        const network = makePublicNetwork({ id: 'net-1' })
        const el = await fixture<NetworkTable>(
            html`<network-table
                .networks=${[network]}
                .activeSessions=${[
                    {
                        id: 'sess-1',
                        network,
                        status: 'disconnected',
                        accessToken: 'token',
                    } as never,
                ]}
            ></network-table>`
        )

        const card = el.shadowRoot!.querySelector('network-card') as
            (HTMLElement & { activeSession: boolean }) | null
        expect(card?.activeSession).toBe(false)
    })
})
