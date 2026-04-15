// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/base-element'
import { css, html } from 'lit'
import { eyeFillIcon, eyeSlashIcon } from '../icons'

/**
 * Emitted when the value of an individual form input changes
 */
export class FormInputChangedEvent extends Event {
    value: string

    constructor(value: string) {
        super('form-input-change', { bubbles: true, composed: true })
        this.value = value
    }
}

/**
 * An individual input field in the network form
 */
@customElement('form-input')
export class FormInput extends BaseElement {
    @property({ type: String }) label = ''
    @property({ type: String }) value = ''
    @property({ type: String }) text = ''
    @property({ type: Boolean }) required = false
    @property({ type: Boolean }) hideable = false

    /** Only takes effect if hideable is true */
    @property({ type: Boolean }) hidden = true

    static styles = [
        BaseElement.styles,
        css`
            .field {
                margin-bottom: var(--wg-space-4);
            }

            .field-label {
                display: inline-flex;
                align-items: center;
                gap: var(--wg-space-1);
                margin-bottom: var(--wg-space-2);
                font-size: var(--wg-font-size-xs);
                font-weight: var(--wg-font-weight-semibold);
                line-height: var(--wg-line-height-tight);
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--wg-label-color);
            }

            .required {
                color: var(--wg-label-required-color);
                font-weight: var(--wg-font-weight-bold);
            }

            .input-group {
                border: 1px solid var(--wg-input-border);
                border-radius: var(--wg-radius-md);
                background: var(--wg-input-bg);
                overflow: hidden;
                box-shadow: var(--wg-shadow-inset);
                transition:
                    border-color 0.2s ease,
                    box-shadow 0.2s ease;
            }

            .input-group:focus-within {
                border-color: var(--wg-input-border-focus);
                box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.18);
            }

            .input-addon {
                border: none;
                border-right: 1px solid var(--wg-input-border);
                background: transparent;
                color: var(--wg-text-secondary);
                width: 2.5rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .input-addon:hover {
                color: var(--wg-text);
                background: rgba(0, 0, 0, 0.03);
            }

            .field-input {
                border: none;
                background: transparent;
                color: var(--wg-input-text);
                font-size: var(--wg-font-size-base);
                line-height: var(--wg-line-height-normal);
                padding: 0.625rem 0.875rem;
            }

            .field-input:focus {
                box-shadow: none;
            }

            .field-input::placeholder {
                color: var(--wg-input-placeholder);
            }

            .field-help {
                margin-top: var(--wg-space-1);
                font-size: var(--wg-font-size-xs);
                color: var(--wg-text-secondary);
            }
        `,
    ]

    render() {
        return html`
            <div class="field">
                <label class="field-label" for=${this.label}>
                    ${this.label}
                    ${this.required
                        ? html`<span class="required" aria-hidden="true"
                              >*</span
                          >`
                        : null}
                </label>
                <div class="input-group">
                    ${this.hideable
                        ? html`<button
                              class="input-addon"
                              @click=${() => (this.hidden = !this.hidden)}
                              type="button"
                              aria-label=${this.hidden
                                  ? 'Show value'
                                  : 'Hide value'}
                          >
                              ${this.hidden ? eyeSlashIcon : eyeFillIcon}
                          </button>`
                        : null}
                    <input
                        .value=${this.value}
                        ?required=${this.required}
                        type=${this.hideable && this.hidden
                            ? 'password'
                            : 'text'}
                        @change=${(e: Event) => {
                            const input = e.target as HTMLInputElement
                            this.value = input.value

                            this.dispatchEvent(
                                new FormInputChangedEvent(this.value)
                            )
                        }}
                        class="form-control field-input"
                        name=${this.label}
                    />
                </div>
                ${this.text
                    ? html`<div class="field-help">${this.text}</div>`
                    : null}
            </div>
        `
    }
}

@customElement('wg-form-input')
export class WgFormInput extends FormInput {}
