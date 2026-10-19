// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture, elementUpdated } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginConnectEvent, type WgLoginForm } from './login-form.js'
import { makeIdp, makePublicNetwork } from './__tests__/fixtures.js'

describe('wg-login-form', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('auto-selects the first non client_credentials network', async () => {
        const networks = [
            makePublicNetwork({
                id: 'cc',
                name: 'CC',
                authMethod: 'client_credentials',
            }),
            makePublicNetwork({
                id: 'oauth',
                name: 'OAuth',
                authMethod: 'authorization_code',
                identityProviderId: 'idp-1',
            }),
        ]
        const idps = [makeIdp({ id: 'idp-1' })]

        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${networks}
                .idps=${idps}
            ></wg-login-form>`
        )

        expect(el.selectedNetwork?.id).toBe('oauth')
        expect(el.selectedIdp?.id).toBe('idp-1')
    })

    it('shows an error when the identity provider is misconfigured', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[
                    makePublicNetwork({ identityProviderId: 'missing' }),
                ]}
                .idps=${[makeIdp({ id: 'other' })]}
            ></wg-login-form>`
        )

        el.shadowRoot!.querySelector<HTMLButtonElement>('.connect-btn')!.click()
        await elementUpdated(el)

        expect(el.messageType).toBe('error')
        expect(el.message).toBe(
            'Identity provider misconfigured for this network.'
        )
    })

    it('cannot be submitted while networks and idps are still loading', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form .loading=${true}></wg-login-form>`
        )

        const select =
            el.shadowRoot!.querySelector<HTMLSelectElement>('.network-select')!
        const connect =
            el.shadowRoot!.querySelector<HTMLButtonElement>('.connect-btn')!

        expect(select.disabled).toBe(true)
        expect(connect.disabled).toBe(true)

        el.networks = [makePublicNetwork({ identityProviderId: 'idp-1' })]
        el.idps = [makeIdp({ id: 'idp-1' })]
        el.loading = false
        await elementUpdated(el)

        expect(select.disabled).toBe(false)
        expect(connect.disabled).toBe(false)
    })

    it('resolves the identity provider when the idps arrive after the networks', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[makePublicNetwork({ identityProviderId: 'idp-1' })]}
            ></wg-login-form>`
        )

        expect(el.selectedIdp).toBeNull()

        el.idps = [makeIdp({ id: 'idp-1' })]
        await elementUpdated(el)

        expect(el.selectedIdp?.id).toBe('idp-1')
    })

    it('keeps the selected network across a refetch, with refreshed details', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[
                    makePublicNetwork({ id: 'a', name: 'A' }),
                    makePublicNetwork({ id: 'b', name: 'B' }),
                ]}
            ></wg-login-form>`
        )
        el.selectedNetwork = el.networks[1]

        el.networks = [
            makePublicNetwork({ id: 'a', name: 'A' }),
            makePublicNetwork({ id: 'b', name: 'B renamed' }),
        ]
        await elementUpdated(el)

        expect(el.selectedNetwork?.id).toBe('b')
        expect(el.selectedNetwork?.name).toBe('B renamed')
    })

    it('falls back to the first usable network when the selected one disappears', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[
                    makePublicNetwork({ id: 'a' }),
                    makePublicNetwork({ id: 'b' }),
                ]}
            ></wg-login-form>`
        )
        el.selectedNetwork = el.networks[1]

        el.networks = [makePublicNetwork({ id: 'a' })]
        await elementUpdated(el)

        expect(el.selectedNetwork?.id).toBe('a')
    })

    it('selects nothing when no network can be logged into', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[makePublicNetwork({ id: 'a' })]}
            ></wg-login-form>`
        )
        expect(el.selectedNetwork?.id).toBe('a')

        el.networks = [
            makePublicNetwork({ id: 'cc', authMethod: 'client_credentials' }),
        ]
        await elementUpdated(el)

        expect(el.selectedNetwork).toBeNull()

        el.networks = []
        await elementUpdated(el)

        expect(el.selectedNetwork).toBeNull()
    })

    it('emits LoginConnectEvent when configuration is valid', async () => {
        const network = makePublicNetwork({
            identityProviderId: 'idp-1',
            clientId: 'client-id',
        })
        const idp = makeIdp({ id: 'idp-1' })

        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[network]}
                .idps=${[idp]}
            ></wg-login-form>`
        )

        const listener = vi.fn()
        el.addEventListener('login-connect', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.connect-btn')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(LoginConnectEvent)
        const event = listener.mock.calls[0][0] as LoginConnectEvent
        expect(event.selectedNetwork).toBe(network)
        expect(event.selectedIdp).toBe(idp)
        expect(event.clientId).toBeUndefined()
        expect(event.clientSecret).toBeUndefined()
        expect(event.username).toBeUndefined()
    })

    it('emits the entered client secret for self-signed identity providers', async () => {
        const network = makePublicNetwork({
            identityProviderId: 'idp-1',
            clientId: 'client-id',
        })
        const idp = makeIdp({ id: 'idp-1', type: 'self_signed' })

        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[network]}
                .idps=${[idp]}
            ></wg-login-form>`
        )

        const secretInput =
            el.shadowRoot!.querySelector<HTMLInputElement>('#client-secret')!
        expect(secretInput.type).toBe('password')
        secretInput.value = 'network-secret'

        const listener = vi.fn()
        el.addEventListener('login-connect', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.connect-btn')!.click()

        expect(listener).toHaveBeenCalledOnce()
        const event = listener.mock.calls[0][0] as LoginConnectEvent
        expect(event.clientId).toBe('client-id')
        expect(event.clientSecret).toBe('network-secret')
        expect(event.username).toBeUndefined()
    })

    it('shows a username field for self_issued identity providers', async () => {
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[
                    makePublicNetwork({
                        identityProviderId: 'idp-1',
                    }),
                ]}
                .idps=${[makeIdp({ id: 'idp-1', type: 'self_issued' })]}
            ></wg-login-form>`
        )

        const username =
            el.shadowRoot!.querySelector<HTMLInputElement>('#username')
        expect(username).not.toBeNull()
        expect(username!.type).toBe('text')
        expect(el.shadowRoot!.querySelector('#client-id')).toBeNull()
        expect(el.shadowRoot!.querySelector('#client-secret')).toBeNull()
    })

    it('emits the entered username for self_issued identity providers', async () => {
        const network = makePublicNetwork({ identityProviderId: 'idp-1' })
        const idp = makeIdp({ id: 'idp-1', type: 'self_issued' })

        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[network]}
                .idps=${[idp]}
            ></wg-login-form>`
        )

        const usernameInput =
            el.shadowRoot!.querySelector<HTMLInputElement>('#username')!
        usernameInput.value = 'alice'

        const listener = vi.fn()
        el.addEventListener('login-connect', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.connect-btn')!.click()

        expect(listener).toHaveBeenCalledOnce()
        const event = listener.mock.calls[0][0] as LoginConnectEvent
        expect(event.selectedNetwork).toBe(network)
        expect(event.selectedIdp).toBe(idp)
        expect(event.username).toBe('alice')
        expect(event.clientId).toBeUndefined()
        expect(event.clientSecret).toBeUndefined()
    })

    it('emits the username for self-issued onboarding', async () => {
        const network = makePublicNetwork({
            identityProviderId: 'idp-1',
            authMethod: 'self_issued',
        })
        const idp = makeIdp({ id: 'idp-1', type: 'self_issued' })
        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[network]}
                .idps=${[idp]}
            ></wg-login-form>`
        )

        const usernameInput =
            el.shadowRoot!.querySelector<HTMLInputElement>('#username')!
        expect(usernameInput).not.toBeNull()
        expect(el.shadowRoot!.querySelector('#client-id')).toBeNull()
        expect(el.shadowRoot!.querySelector('#client-secret')).toBeNull()
        usernameInput.value = 'alice'

        const listener = vi.fn()
        el.addEventListener('login-connect', listener)
        el.shadowRoot!.querySelector<HTMLButtonElement>('.connect-btn')!.click()

        const event = listener.mock.calls[0][0] as LoginConnectEvent
        expect(event.username).toBe('alice')
        expect(event.clientId).toBeUndefined()
        expect(event.clientSecret).toBeUndefined()
    })

    it('submits on form submit event', async () => {
        const network = makePublicNetwork({
            identityProviderId: 'idp-1',
            clientId: 'client-id',
        })
        const idp = makeIdp({ id: 'idp-1' })

        const el = await fixture<WgLoginForm>(
            html`<wg-login-form
                .networks=${[network]}
                .idps=${[idp]}
            ></wg-login-form>`
        )

        const listener = vi.fn()
        el.addEventListener('login-connect', listener)

        el.shadowRoot!.querySelector('form')!.dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        )

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(LoginConnectEvent)
    })
})
