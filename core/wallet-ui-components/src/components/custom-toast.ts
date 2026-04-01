// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'

export type ToastMessageType = 'info' | 'success' | 'error'

@customElement('custom-toast')
export class Toast extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                position: fixed;
                bottom: 20px;
                right: 20px;
                max-width: 500px;
                z-index: 1000;
            }

            .toast-wrapper {
                display: flex;
                flex-direction: column;
                border: 2px solid;
                padding: 12px 20px;
                border-radius: var(--wg-radius-lg);
                font-family: var(--wg-font-family);
            }

            .info {
                background-color: rgba(var(--wg-accent-rgb), 0.1);
                border-color: rgba(var(--wg-accent-rgb), 0.3);
            }

            .success {
                background-color: rgba(var(--wg-success-rgb), 0.1);
                border-color: rgba(var(--wg-success-rgb), 0.3);
            }

            .error {
                background-color: rgba(var(--wg-error-rgb), 0.1);
                border-color: rgba(var(--wg-error-rgb), 0.3);
            }

            .toast-title {
                font-weight: var(--wg-font-weight-bold);
            }

            .info .toast-title,
            .info .toast-message {
                color: var(--wg-accent);
            }

            .success .toast-title,
            .success .toast-message {
                color: var(--wg-success);
            }

            .error .toast-title,
            .error .toast-message {
                color: var(--wg-error);
            }

            .toast-btn {
                border: none;
                border-radius: var(--wg-radius-full);
                padding: 0.4rem 0.85rem;
                font-size: var(--wg-font-size-sm);
                font-weight: var(--wg-font-weight-semibold);
                cursor: pointer;
                align-self: flex-end;
                transition: background-color 0.2s ease;
            }

            .info .toast-btn {
                color: var(--wg-accent);
                background: rgba(var(--wg-accent-rgb), 0.15);
            }
            .info .toast-btn:hover {
                background: rgba(var(--wg-accent-rgb), 0.25);
            }

            .success .toast-btn {
                color: var(--wg-success);
                background: rgba(var(--wg-success-rgb), 0.15);
            }
            .success .toast-btn:hover {
                background: rgba(var(--wg-success-rgb), 0.25);
            }

            .error .toast-btn {
                color: var(--wg-error);
                background: rgba(var(--wg-error-rgb), 0.15);
            }
            .error .toast-btn:hover {
                background: rgba(var(--wg-error-rgb), 0.25);
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
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
                    transform: translateY(20px);
                }
            }

            .toast-wrapper {
                animation: fadeIn 0.6s ease-out;
                transition: opacity 0.6s ease-out;
            }

            .toast-wrapper.closing {
                animation: fadeOut 0.6s ease-in forwards;
            }

            @media (max-width: 600px) {
                :host {
                    max-width: 300px;
                }
            }
        `,
    ]

    @property({ type: String }) title = ''
    @property({ type: String }) message = ''
    @property({ type: String }) buttonText = 'Okay'
    @property({ type: String }) type: ToastMessageType = 'error'
    @property({ type: Boolean }) closing = false

    private closeToast() {
        this.closing = true
        setTimeout(() => {
            this.closing = false
            this.remove()
        }, 600)
    }

    connectedCallback() {
        super.connectedCallback()
        setTimeout(() => this.closeToast(), 5000)
    }

    render() {
        return html`
            <div
                class="toast-wrapper ${this.type} ${this.closing
                    ? 'closing'
                    : ''}"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
            >
                <h5 class="toast-title">${this.title}</h5>
                <h6 class="toast-message">${this.message}</h6>
                <button
                    type="button"
                    class="toast-btn"
                    @click=${this.closeToast}
                >
                    ${this.buttonText}
                </button>
            </div>
        `
    }
}
