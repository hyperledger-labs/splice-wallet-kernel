// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { elementUpdated, fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './wallet-create-form.js'
import {
    WalletCreateEvent,
    SigningProviderChangeEvent,
    WgWalletCreateForm,
} from './wallet-create-form.js'

function submitForm(el: WgWalletCreateForm) {
    const form = el.shadowRoot!.querySelector<HTMLFormElement>('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function fillForm(
    el: WgWalletCreateForm,
    values: {
        partyHint?: string
        signingProviderId?: string
        primary?: boolean
    }
) {
    if (values.partyHint !== undefined) {
        const input =
            el.shadowRoot!.querySelector<HTMLInputElement>('#party-id-hint')!
        input.value = values.partyHint
        input.dispatchEvent(new Event('input', { bubbles: true }))
    }
    if (values.signingProviderId !== undefined) {
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.value = values.signingProviderId
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.dispatchEvent(new Event('change', { bubbles: true }))
    }
    if (values.primary !== undefined) {
        const checkbox =
            el.shadowRoot!.querySelector<HTMLInputElement>('#primary')!
        checkbox.checked = values.primary
        checkbox.dispatchEvent(new Event('change', { bubbles: true }))
    }
}

describe('wg-wallet-create-form', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form></wg-wallet-create-form>`
        )

        expect(el).toBeInstanceOf(WgWalletCreateForm)
    })

    it('renders signing provider options from props', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['participant', 'wallet-kernel']}
            ></wg-wallet-create-form>`
        )

        const options = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLOptionElement>(
                '#signing-provider-id option'
            )
        ).map((option) => option.value)

        expect(options).toContain('participant')
        expect(options).toContain('wallet-kernel')
    })

    it('shows signing provider loading state while providers are being fetched', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                ?signingProvidersLoading=${true}
            ></wg-wallet-create-form>`
        )

        const providerSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!
        expect(providerSelect.disabled).toBe(true)
        expect(
            providerSelect.querySelector('option')?.textContent?.trim()
        ).toBe('Loading signing providers...')
        expect(
            el.shadowRoot?.querySelector<HTMLButtonElement>('.submit-button')
                ?.disabled
        ).toBe(true)
    })

    it('emits WalletCreateEvent with form values on submit', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['wallet-kernel']}
            ></wg-wallet-create-form>`
        )
        fillForm(el, {
            partyHint: 'alice',
            signingProviderId: 'wallet-kernel',
            primary: false,
        })

        const listener = vi.fn()
        el.addEventListener('wallet-create', listener)

        submitForm(el)

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(WalletCreateEvent)
        const event = listener.mock.calls[0][0] as WalletCreateEvent
        expect(event.partyHint).toBe('alice')
        expect(event.signingProviderId).toBe('wallet-kernel')
        expect(event.primary).toBe(false)
        expect(event.keyName).toBeUndefined()
    })

    it('includes primary=true when the checkbox is checked', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['internal']}
            ></wg-wallet-create-form>`
        )
        fillForm(el, {
            partyHint: 'bob',
            signingProviderId: 'internal',
            primary: true,
        })

        const listener = vi.fn()
        el.addEventListener('wallet-create', listener)

        submitForm(el)

        expect((listener.mock.calls[0][0] as WalletCreateEvent).primary).toBe(
            true
        )
    })

    it('does not emit when submitting', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['participant']}
                .submitting=${true}
            ></wg-wallet-create-form>`
        )
        fillForm(el, {
            partyHint: 'alice',
            signingProviderId: 'participant',
        })

        const listener = vi.fn()
        el.addEventListener('wallet-create', listener)

        submitForm(el)

        expect(listener).not.toHaveBeenCalled()
    })

    it('shows submitting state while creating a wallet', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .submitting=${true}
                submitLabel="Add"
                submittingLabel="Adding..."
                submittingMessage="Creating party, please wait..."
            ></wg-wallet-create-form>`
        )

        expect(
            el.shadowRoot?.querySelector('.submit-button')?.textContent
        ).toContain('Adding...')
        expect(
            el.shadowRoot
                ?.querySelector('.loading-message')
                ?.textContent?.trim()
        ).toBe('Creating party, please wait...')
        expect(
            el.shadowRoot?.querySelector<HTMLInputElement>('#party-id-hint')
                ?.disabled
        ).toBe(true)
        expect(
            el.shadowRoot?.querySelector<HTMLSelectElement>(
                '#signing-provider-id'
            )?.disabled
        ).toBe(true)
    })

    it('emits SigningProviderChangeEvent when signing provider changes', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['participant', 'fireblocks']}
                .vaultSigningProviders=${['fireblocks']}
            ></wg-wallet-create-form>`
        )

        const listener = vi.fn()
        el.addEventListener('signing-provider-change', listener)

        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.value = 'fireblocks'
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.dispatchEvent(new Event('change', { bubbles: true }))

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(
            SigningProviderChangeEvent
        )
        expect(
            (listener.mock.calls[0][0] as SigningProviderChangeEvent)
                .signingProviderId
        ).toBe('fireblocks')
    })

    it('shows vault select only for configured vault signing providers', async () => {
        const keys = [{ id: 'key-1', name: 'Vault A', publicKey: 'pk1' }]
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['participant', 'fireblocks']}
                .keySigningProviders=${['fireblocks']}
                .publicKeys=${keys}
            ></wg-wallet-create-form>`
        )

        expect(el.shadowRoot?.querySelector('#vault-name')).toBeNull()

        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.value = 'fireblocks'
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.dispatchEvent(new Event('change', { bubbles: true }))
        await elementUpdated(el)

        expect(el.shadowRoot?.querySelector('#vault-name')).not.toBeNull()
        const options = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLOptionElement>(
                '#vault-name option'
            )
        ).map((option) => option.value)
        expect(options).toContain('key-1')
    })

    it('includes keyName in WalletCreateEvent when selected', async () => {
        const keys = [{ id: 'key-1', name: 'Vault A', publicKey: 'pk1' }]
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['fireblocks']}
                .keySigningProviders=${['fireblocks']}
                .publicKeys=${keys}
            ></wg-wallet-create-form>`
        )

        fillForm(el, {
            partyHint: 'alice',
            signingProviderId: 'fireblocks',
        })
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.dispatchEvent(new Event('change', { bubbles: true }))
        await elementUpdated(el)
        el.shadowRoot!.querySelector<HTMLSelectElement>('#vault-name')!.value =
            'key-1'
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#vault-name'
        )!.dispatchEvent(new Event('change', { bubbles: true }))

        const listener = vi.fn()
        el.addEventListener('wallet-create', listener)
        submitForm(el)

        expect((listener.mock.calls[0][0] as WalletCreateEvent).keyName).toBe(
            'Vault A'
        )
    })

    it('shows vault loading state while vaults are being fetched', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['fireblocks']}
                .keySigningProviders=${['fireblocks']}
                ?publicKeysLoading=${true}
            ></wg-wallet-create-form>`
        )

        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.value = 'fireblocks'
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.dispatchEvent(new Event('change', { bubbles: true }))
        await elementUpdated(el)

        const vaultSelect =
            el.shadowRoot!.querySelector<HTMLSelectElement>('#vault-name')
        expect(vaultSelect?.disabled).toBe(true)
        expect(vaultSelect?.querySelector('option')?.textContent?.trim()).toBe(
            'Loading vaults...'
        )
        expect(
            el.shadowRoot?.querySelector<HTMLButtonElement>('.submit-button')
                ?.disabled
        ).toBe(true)
    })

    it('does not emit when vaults are loading', async () => {
        const el = await fixture<WgWalletCreateForm>(
            html`<wg-wallet-create-form
                .signingProviders=${['fireblocks']}
                .keySigningProviders=${['fireblocks']}
                ?publicKeysLoading=${true}
            ></wg-wallet-create-form>`
        )

        fillForm(el, {
            partyHint: 'alice',
            signingProviderId: 'fireblocks',
        })
        el.shadowRoot!.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )!.dispatchEvent(new Event('change', { bubbles: true }))
        await elementUpdated(el)

        const listener = vi.fn()
        el.addEventListener('wallet-create', listener)
        submitForm(el)

        expect(listener).not.toHaveBeenCalled()
    })
})
