// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement.js'

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
            }

            .toast-wrapper {
                display: flex;
                flex-direction: column;
                border: 2px solid;
                padding: 12px 20px;
                border-radius: 6px;
            }

            .info {
                background-color: var(--bs-primary-bg-subtle);
                border-color: var(--bs-primary-border-subtle);
            }

            .success {
                background-color: var(--bs-success-bg-subtle);
                border-color: var(--bs-success-border-subtle);
            }

            .error {
                background-color: var(--bs-danger-bg-subtle);
                border-color: var(--bs-danger-border-subtle);
            }

            .toast-title {
                font-weight: 700;
            }

            .info .toast-title,
            .info .toast-message {
                color: var(--bs-primary-text-emphasis);
            }

            .success .toast-title,
            .success .toast-message {
                color: var(--bs-success-text-emphasis);
            }

            .error .toast-title,
            .error .toast-message {
                color: var(--bs-error-text-emphasis);
            }

            .btn {
                align-self: flex-end;
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

    @property({ type: String }) title = 'Notification'
    @property({ type: String }) message =
        'This is a simple toast message with a clean layout.erogjeorp peorgnieowf eriwfherog'
    @property({ type: String }) buttonText = 'Okay'
    @property({ type: String }) type: 'info' | 'success' | 'error' = 'error'
    @property({ type: Boolean }) closing = false

    private _closeToast() {
        this.closing = true
        setTimeout(() => {
            this.closing = false
        }, 600)
    }

    connectedCallback() {
        super.connectedCallback()
        setTimeout(() => this._closeToast(), 5000)
    }

    render() {
        let btnType = ''

        if (this.type === 'success') {
            btnType = 'btn-success'
        } else if (this.type === 'error') {
            btnType = 'btn-danger'
        } else {
            btnType = 'btn-primary'
        }

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
                    class="btn ${btnType}"
                    @click=${this._closeToast}
                >
                    ${this.buttonText}
                </button>
            </div>
        `
    }
}
