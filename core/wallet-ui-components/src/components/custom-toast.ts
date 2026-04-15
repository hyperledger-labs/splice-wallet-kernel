// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'

export type ToastMessageType = 'info' | 'success' | 'error'

const TOAST_DISMISS_DELAY_MS = 5000
const TOAST_ANIMATION_MS = 250

@customElement('custom-toast')
export class Toast extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 1000;
                width: min(100vw - 40px, 380px);
                font-family: var(--wg-font-family);
            }

            .toast-wrapper {
                --toast-accent-color: var(--wg-error);
                --toast-accent-rgb: var(--wg-error-rgb);

                position: relative;
                display: flex;
                flex-direction: column;
                gap: var(--wg-space-1);
                padding: var(--wg-space-4);
                padding-right: calc(var(--wg-space-4) + 1.5rem);
                background: var(--wg-surface);
                color: var(--wg-text);
                border: 1px solid rgba(15, 23, 42, 0.08);
                border-left: 4px solid var(--toast-accent-color);
                border-radius: var(--wg-radius-lg);
                box-shadow: var(--wg-shadow-lg);
                animation: fadeIn ${TOAST_ANIMATION_MS}ms ease-out;
            }

            .toast-wrapper.info {
                --toast-accent-color: var(--wg-accent);
                --toast-accent-rgb: var(--wg-accent-rgb);
            }

            .toast-wrapper.success {
                --toast-accent-color: var(--wg-success);
                --toast-accent-rgb: var(--wg-success-rgb);
            }

            .toast-wrapper.error {
                --toast-accent-color: var(--wg-error);
                --toast-accent-rgb: var(--wg-error-rgb);
            }

            .toast-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: var(--wg-space-3);
            }

            .toast-title {
                margin: 0;
                font-size: var(--wg-font-size-lg);
                line-height: var(--wg-line-height-tight);
                font-weight: var(--wg-font-weight-bold);
                color: var(--toast-accent-color);
            }

            .toast-message {
                margin: 0;
                font-size: var(--wg-font-size-base);
                line-height: var(--wg-line-height-normal);
                color: var(--wg-text-secondary);
            }

            .toast-close-btn {
                position: absolute;
                top: 10px;
                right: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1.5rem;
                height: 1.5rem;
                padding: 0;
                border: none;
                border-radius: var(--wg-radius-full);
                background: transparent;
                color: var(--wg-text-secondary);
                cursor: pointer;
                transition:
                    background-color 0.2s ease,
                    color 0.2s ease;
            }

            .toast-close-btn:hover {
                background: var(--wg-icon-bg);
                color: var(--wg-text);
            }

            .toast-close-btn:focus-visible {
                outline: 2px solid var(--toast-accent-color);
                outline-offset: 2px;
            }

            .toast-close-icon {
                font-size: 1.1rem;
                line-height: 1;
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fadeOut {
                from {
                    opacity: 1;
                    transform: translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateY(8px);
                }
            }

            .toast-wrapper.closing {
                animation: fadeOut ${TOAST_ANIMATION_MS}ms ease-in forwards;
            }

            @media (max-width: 600px) {
                :host {
                    right: 16px;
                    bottom: 16px;
                    width: calc(100vw - 32px);
                }
            }
        `,
    ]

    @property({ type: String }) title = ''
    @property({ type: String }) message = ''
    @property({ type: String }) buttonText = 'Dismiss notification'
    @property({ type: String }) type: ToastMessageType = 'error'
    @property({ type: Boolean }) closing = false

    private dismissTimeout: number | undefined
    private removeTimeout: number | undefined

    private closeToast = () => {
        if (this.closing) return

        if (this.dismissTimeout) {
            window.clearTimeout(this.dismissTimeout)
            this.dismissTimeout = undefined
        }

        this.closing = true
        this.removeTimeout = window.setTimeout(() => {
            this.closing = false
            this.remove()
        }, TOAST_ANIMATION_MS)
    }

    connectedCallback() {
        super.connectedCallback()
        this.dismissTimeout = window.setTimeout(
            () => this.closeToast(),
            TOAST_DISMISS_DELAY_MS
        )
    }

    disconnectedCallback(): void {
        if (this.dismissTimeout) {
            window.clearTimeout(this.dismissTimeout)
            this.dismissTimeout = undefined
        }

        if (this.removeTimeout) {
            window.clearTimeout(this.removeTimeout)
            this.removeTimeout = undefined
        }

        super.disconnectedCallback()
    }

    render() {
        const isAssertive = this.type === 'error'

        return html`
            <div
                class="toast-wrapper ${this.type} ${this.closing
                    ? 'closing'
                    : ''}"
                role=${isAssertive ? 'alert' : 'status'}
                aria-live=${isAssertive ? 'assertive' : 'polite'}
                aria-atomic="true"
            >
                <div class="toast-header">
                    <p class="toast-title">${this.title}</p>
                </div>
                <p class="toast-message">${this.message}</p>
                <button
                    type="button"
                    class="toast-close-btn"
                    aria-label=${this.buttonText}
                    @click=${this.closeToast}
                >
                    <span class="toast-close-icon" aria-hidden="true">×</span>
                </button>
            </div>
        `
    }
}
