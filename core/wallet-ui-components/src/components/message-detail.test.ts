// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './copy-button.js'
import './message-detail.js'
import { MessageApproveEvent, MessageDeleteEvent } from './message-detail.js'

describe('wg-message-detail', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders the message, status, and external transaction id', async () => {
        const el = await fixture(
            html`<wg-message-detail
                messageId="msg-1"
                message="Content"
                status="pending"
                origin="https://dapp.example"
            ></wg-message-detail>`
        )

        const text = el.shadowRoot?.textContent
        expect(text).toContain('Content')
        expect(text).toContain('pending')
        expect(text).toContain('https://dapp.example')
    })

    it('emits delete event for pending messages', async () => {
        const el = await fixture(
            html`<wg-message-detail
                messageId="msg-1"
                message="Content"
                status="pending"
                origin="https://dapp.example"
            ></wg-message-detail>`
        )

        const deleteListener = vi.fn()
        el.addEventListener('message-delete', deleteListener)

        const rejectButton = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Reject'))!

        rejectButton.click()

        expect(deleteListener).toHaveBeenCalledOnce()
        expect(deleteListener.mock.calls[0][0]).toBeInstanceOf(
            MessageDeleteEvent
        )
        expect(
            (deleteListener.mock.calls[0][0] as MessageDeleteEvent).messageId
        ).toBe('msg-1')
    })

    it('emits approve event for pending messages', async () => {
        const el = await fixture(
            html`<wg-message-detail
                messageId="msg-1"
                message="Content"
                status="pending"
                origin="https://dapp.example"
            ></wg-message-detail>`
        )

        const approveListener = vi.fn()
        el.addEventListener('message-approve', approveListener)

        const approveButton = Array.from(
            el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Approve'))!

        approveButton.click()

        expect(approveListener).toHaveBeenCalledOnce()
        expect(approveListener.mock.calls[0][0]).toBeInstanceOf(
            MessageApproveEvent
        )
        expect(
            (approveListener.mock.calls[0][0] as MessageApproveEvent).messageId
        ).toBe('msg-1')
    })

    it('hides action buttons once the message is signed', async () => {
        const el = await fixture(
            html`<wg-message-detail
                status="signed"
                messageId="msg-done"
            ></wg-message-detail>`
        )

        expect(el.shadowRoot?.querySelector('.actions')).toBeNull()
    })

    it('hides action buttons once the message is awaiting-signature', async () => {
        const el = await fixture(
            html`<wg-message-detail
                status="awaiting-signature"
                messageId="msg-done"
                externalTxId="ext-1"
            ></wg-message-detail>`
        )

        expect(el.shadowRoot?.querySelector('.actions')).toBeNull()
        const text = el.shadowRoot?.textContent
        expect(text).toContain('ext-1')
    })

    it('hides action buttons once the message has failed', async () => {
        const el = await fixture(
            html`<wg-message-detail
                status="failed"
                messageId="msg-failed"
            ></wg-message-detail>`
        )

        expect(el.shadowRoot?.querySelector('.actions')).toBeNull()
    })

    it('shows the requester and external transaction id rows only when set', async () => {
        const withValues = await fixture(
            html`<wg-message-detail
                messageId="msg-1"
                message="Content"
                status="awaiting-signature"
                origin="https://dapp.example"
                externalTxId="ext-1"
            ></wg-message-detail>`
        )
        const withValuesText = withValues.shadowRoot?.textContent
        expect(withValuesText).toContain('Requested by')
        expect(withValuesText).toContain('External transaction ID')
        expect(withValues.shadowRoot?.querySelector('wg-copy-button')).not.toBe(
            null
        )

        const withoutValues = await fixture(
            html`<wg-message-detail
                messageId="msg-2"
                message="Content"
                status="pending"
            ></wg-message-detail>`
        )
        const withoutValuesText = withoutValues.shadowRoot?.textContent
        expect(withoutValuesText).not.toContain('Requested by')
        expect(withoutValuesText).not.toContain('External transaction ID')
        expect(withoutValues.shadowRoot?.querySelector('wg-copy-button')).toBe(
            null
        )
    })

    it('disables approve while signing and both actions when disabled', async () => {
        const buttons = (el: Element) => {
            const all = Array.from(
                el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button')
            )
            return {
                approve: all.find((b) => b.textContent?.includes('Approve'))!,
                reject: all.find((b) => b.textContent?.includes('Reject'))!,
            }
        }

        const signing = await fixture(
            html`<wg-message-detail
                messageId="msg-1"
                status="pending"
                .isSigning=${true}
            ></wg-message-detail>`
        )
        expect(buttons(signing).approve.disabled).toBe(true)
        expect(
            buttons(signing).approve.querySelector('.spinner-border')
        ).not.toBeNull()

        const disabled = await fixture(
            html`<wg-message-detail
                messageId="msg-1"
                status="pending"
                .disabled=${true}
            ></wg-message-detail>`
        )
        expect(buttons(disabled).approve.disabled).toBe(true)
        expect(buttons(disabled).reject.disabled).toBe(true)
    })
})
