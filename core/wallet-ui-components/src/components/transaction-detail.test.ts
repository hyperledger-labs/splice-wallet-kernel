// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture, elementUpdated } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './copy-button.js'
import './transaction-detail.js'
import {
    TransactionApproveEvent,
    TransactionDeleteEvent,
} from './transaction-detail.js'

describe('wg-transaction-detail', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('toggles decoded JSON visibility', async () => {
        const el = await fixture(
            html`<wg-transaction-detail
                commandId="cmd-1"
                .parsed=${{ jsonString: '{"a":1}' }}
            ></wg-transaction-detail>`
        )

        expect(el.shadowRoot?.querySelector('.decoded-box')).toBeNull()

        el.shadowRoot!.querySelector<HTMLButtonElement>('.toggle-btn')!.click()
        await elementUpdated(el)

        expect(el.shadowRoot?.querySelector('.decoded-box')?.textContent).toBe(
            '{"a":1}'
        )
    })

    it('emits delete event for pending transactions', async () => {
        const el = await fixture(
            html`<wg-transaction-detail
                commandId="cmd-pending"
                status="pending"
            ></wg-transaction-detail>`
        )

        const deleteListener = vi.fn()
        el.addEventListener('transaction-delete', deleteListener)

        const rejectButton = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Reject'))!

        rejectButton.click()

        expect(deleteListener).toHaveBeenCalledOnce()
        expect(deleteListener.mock.calls[0][0]).toBeInstanceOf(
            TransactionDeleteEvent
        )
        expect(
            (deleteListener.mock.calls[0][0] as TransactionDeleteEvent)
                .commandId
        ).toBe('cmd-pending')
    })

    it('emits approve event for pending transactions', async () => {
        const el = await fixture(
            html`<wg-transaction-detail
                commandId="cmd-pending"
                status="pending"
            ></wg-transaction-detail>`
        )

        const approveListener = vi.fn()
        el.addEventListener('transaction-approve', approveListener)

        const approveButton = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Approve'))!

        approveButton.click()

        expect(approveListener).toHaveBeenCalledOnce()
        expect(approveListener.mock.calls[0][0]).toBeInstanceOf(
            TransactionApproveEvent
        )
        expect(
            (approveListener.mock.calls[0][0] as TransactionApproveEvent)
                .commandId
        ).toBe('cmd-pending')
    })

    it('keeps the retry label while a failed submit is retried', async () => {
        const el = await fixture(
            html`<wg-transaction-detail
                status="signed"
                commandId="cmd-signed"
                .submitFailed=${true}
                .isApproving=${true}
            ></wg-transaction-detail>`
        )

        expect(
            el.shadowRoot?.querySelector('.actions button')?.textContent
        ).toContain('Retry submit')
    })

    it('keeps the approve label for a signed transaction during its first submit', async () => {
        const el = await fixture(
            html`<wg-transaction-detail
                status="signed"
                commandId="cmd-signed"
                .isApproving=${true}
            ></wg-transaction-detail>`
        )

        expect(
            el.shadowRoot?.querySelector('.actions button')?.textContent
        ).toContain('Approve')
    })

    it('hides action buttons for executed transactions', async () => {
        const el = await fixture(
            html`<wg-transaction-detail
                status="executed"
                commandId="cmd-done"
            ></wg-transaction-detail>`
        )

        expect(el.shadowRoot?.querySelector('.actions')).toBeNull()
    })
})
