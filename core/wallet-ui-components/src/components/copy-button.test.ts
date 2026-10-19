// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture, elementUpdated } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './copy-button.js'
import { CopySuccessEvent, type WgCopyButton } from './copy-button.js'

describe('wg-copy-button', () => {
    afterEach(() => {
        document.body.innerHTML = ''
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('does nothing when value is empty', async () => {
        const el = await fixture<WgCopyButton>(
            html`<wg-copy-button></wg-copy-button>`
        )
        const listener = vi.fn()
        el.addEventListener('copy-success', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.copy-btn')!.click()

        expect(listener).not.toHaveBeenCalled()
    })

    it('copies value to the clipboard and emits CopySuccessEvent', async () => {
        let clipboardText = ''
        vi.stubGlobal('navigator', {
            clipboard: {
                writeText: vi.fn(async (text: string) => {
                    clipboardText = text
                }),
                readText: vi.fn(async () => clipboardText),
            },
        })

        const el = await fixture<WgCopyButton>(
            html`<wg-copy-button .value=${'copy-me'}></wg-copy-button>`
        )
        const listener = vi.fn()
        el.addEventListener('copy-success', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.copy-btn')!.click()
        await Promise.resolve()
        await elementUpdated(el)

        expect(await navigator.clipboard.readText()).toBe('copy-me')
        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(CopySuccessEvent)
        expect((listener.mock.calls[0][0] as CopySuccessEvent).value).toBe(
            'copy-me'
        )
        expect(
            el.shadowRoot!.querySelector<HTMLButtonElement>('.copy-btn')!
                .className
        ).toContain('copied')
    })

    it('uses fallback copy when clipboard API is unavailable', async () => {
        vi.stubGlobal('navigator', {
            clipboard: undefined,
        })
        const execCommand = vi
            .spyOn(document, 'execCommand')
            .mockReturnValue(true)

        const el = await fixture<WgCopyButton>(
            html`<wg-copy-button .value=${'fallback-value'}></wg-copy-button>`
        )

        el.shadowRoot!.querySelector<HTMLButtonElement>('.copy-btn')!.click()
        await Promise.resolve()

        expect(execCommand).toHaveBeenCalledWith('copy')
    })
})
