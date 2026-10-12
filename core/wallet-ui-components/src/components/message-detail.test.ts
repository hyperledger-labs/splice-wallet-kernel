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
})
