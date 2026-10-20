// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import type { Session } from '@canton-network/core-wallet-user-rpc-client'
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import './copy-button.js'
import './sessions.js'
import type { WgCopyButton } from './copy-button.js'
import { makeIdp } from './__tests__/fixtures.js'
import { WgSessions } from './sessions.js'

function makeSession(overrides: Partial<Session> = {}): Session {
    return {
        id: 'session-1',
        network: {
            id: 'net-1',
            name: 'Test Network',
            description: 'Test network description',
            identityProviderId: 'idp-1',
            ledgerApi: 'http://localhost:6865',
            auth: {
                method: 'authorization_code',
                audience: 'audience',
                scope: 'scope',
                clientId: 'client-id',
            },
        },
        idp: makeIdp(),
        accessToken: 'secret-token',
        status: 'connected',
        rights: [],
        ...overrides,
    }
}

describe('wg-sessions', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<WgSessions>(html`<wg-sessions></wg-sessions>`)

        expect(el).toBeInstanceOf(WgSessions)
    })

    it('shows a placeholder when there are no sessions', async () => {
        const el = await fixture<WgSessions>(html`<wg-sessions></wg-sessions>`)

        expect(el.shadowRoot?.textContent).toContain('No active sessions.')
        expect(el.shadowRoot?.querySelector('.sessions-list')).toBeNull()
    })

    it('renders a session card for each active session', async () => {
        const sessions = [
            makeSession({
                id: 'session-1',
                network: { ...makeSession().network, id: 'net-one' },
            }),
            makeSession({
                id: 'session-2',
                network: { ...makeSession().network, id: 'net-two' },
            }),
        ]
        const el = await fixture<WgSessions>(
            html`<wg-sessions .sessions=${sessions}></wg-sessions>`
        )

        const cards = el.shadowRoot!.querySelectorAll('.session-card')
        expect(cards.length).toBe(2)
        expect(el.shadowRoot?.textContent).toContain('net-one')
        expect(el.shadowRoot?.textContent).toContain('net-two')
    })

    it('shows connected styling for connected sessions', async () => {
        const el = await fixture<WgSessions>(
            html`<wg-sessions
                .sessions=${[makeSession({ status: 'connected' })]}
            ></wg-sessions>`
        )

        expect(el.shadowRoot?.textContent).toContain('connected')
        expect(
            el.shadowRoot?.querySelector('.status-dot.connected')
        ).not.toBeNull()
        expect(
            el.shadowRoot?.querySelector('.status-label.connected')
        ).not.toBeNull()
    })

    it('shows disconnected styling for disconnected sessions', async () => {
        const el = await fixture<WgSessions>(
            html`<wg-sessions
                .sessions=${[
                    makeSession({
                        status: 'disconnected',
                        reason: 'Token expired',
                    }),
                ]}
            ></wg-sessions>`
        )

        expect(el.shadowRoot?.textContent).toContain('disconnected')
        expect(
            el.shadowRoot?.querySelector('.status-dot.disconnected')
        ).not.toBeNull()
        expect(
            el.shadowRoot?.querySelector('.status-label.disconnected')
        ).not.toBeNull()
    })

    it('renders permissions when rights are present', async () => {
        const el = await fixture<WgSessions>(
            html`<wg-sessions
                .sessions=${[
                    makeSession({
                        rights: ['CanReadAsAnyParty', 'CanExecuteAsAnyParty'],
                    }),
                ]}
            ></wg-sessions>`
        )

        expect(el.shadowRoot?.textContent).toContain('Permissions:')
        expect(el.shadowRoot?.textContent).toContain(
            'CanReadAsAnyParty, CanExecuteAsAnyParty'
        )
    })

    it('hides permissions when rights are empty', async () => {
        const el = await fixture<WgSessions>(
            html`<wg-sessions
                .sessions=${[makeSession({ rights: [] })]}
            ></wg-sessions>`
        )

        expect(el.shadowRoot?.textContent).not.toContain('Permissions:')
    })

    it('renders a reason when one is provided', async () => {
        const el = await fixture<WgSessions>(
            html`<wg-sessions
                .sessions=${[
                    makeSession({
                        status: 'disconnected',
                        reason: 'Session revoked',
                    }),
                ]}
            ></wg-sessions>`
        )

        expect(el.shadowRoot?.textContent).toContain('Reason:')
        expect(el.shadowRoot?.textContent).toContain('Session revoked')
    })

    it('renders an access token copy control', async () => {
        const el = await fixture<WgSessions>(
            html`<wg-sessions
                .sessions=${[makeSession({ accessToken: 'copy-me-token' })]}
            ></wg-sessions>`
        )

        expect(el.shadowRoot?.textContent).toContain('Access Token:')
        expect(el.shadowRoot?.textContent).toContain('[private]')

        const copyButton =
            el.shadowRoot!.querySelector<WgCopyButton>('wg-copy-button')
        expect(copyButton).not.toBeNull()
        expect(copyButton!.label).toBe('Copy access token')
        expect(copyButton!.value).toBe('copy-me-token')
    })
})
