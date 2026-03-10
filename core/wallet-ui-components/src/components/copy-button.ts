// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { clipboardIcon } from '../icons'

export class CopySuccessEvent extends Event {
    constructor(public value: string) {
        super('copy-success', { bubbles: true, composed: true })
    }
}

@customElement('wg-copy-button')
export class WgCopyButton extends BaseElement {
    @property({ type: String }) value = ''
    @property({ type: String }) label = 'Copy to clipboard'

    @state() private copied = false

    static styles = [
        BaseElement.styles,
        css`
            .copy-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 2rem;
                height: 2rem;
                border: 1px solid transparent;
                border-radius: var(--wg-radius-full);
                background: rgba(var(--wg-accent-rgb), 0.1);
                color: var(--wg-accent);
                cursor: pointer;
                transition:
                    background-color 0.2s ease,
                    border-color 0.2s ease,
                    transform 0.2s ease;
            }

            .copy-btn:hover {
                background: rgba(var(--wg-accent-rgb), 0.16);
                border-color: rgba(var(--wg-accent-rgb), 0.35);
            }

            .copy-btn:active {
                transform: scale(0.96);
            }

            .copy-btn.copied {
                background: rgba(var(--wg-success-rgb), 0.16);
                color: var(--wg-success);
                border-color: rgba(var(--wg-success-rgb), 0.3);
            }
        `,
    ]

    private async copyToClipboard() {
        if (!this.value) return

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(this.value)
            } else {
                this.fallbackCopy(this.value)
            }

            this.copied = true
            this.dispatchEvent(new CopySuccessEvent(this.value))
            window.setTimeout(() => {
                this.copied = false
            }, 1200)
        } catch (error) {
            console.error('Unable to copy value', error)
        }
    }

    private fallbackCopy(value: string) {
        const input = document.createElement('textarea')
        input.value = value
        input.style.position = 'fixed'
        input.style.left = '-9999px'

        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
    }

    render() {
        return html`
            <button
                type="button"
                class="copy-btn ${this.copied ? 'copied' : ''}"
                @click=${this.copyToClipboard}
                aria-label=${this.label}
                title=${this.copied ? 'Copied' : this.label}
            >
                ${clipboardIcon}
            </button>
        `
    }
}
