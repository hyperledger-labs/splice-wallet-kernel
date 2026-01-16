// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement'
import { html } from 'lit'
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

    static styles = [BaseElement.styles]

    render() {
        return html`
            <div class="mb-3">
                <label for=${this.label}>${this.label}</label>
                <div class="input-group">
                    ${this.hideable
                        ? html`<button
                              class="btn btn-outline-secondary"
                              @click=${() => (this.hidden = !this.hidden)}
                              type="button"
                              id="button-addon2"
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
                        type="text"
                        class="form-control"
                        name=${this.label}
                    />
                </div>
                ${this.text
                    ? html`<div class="form-text">${this.text}</div>`
                    : null}
            </div>
        `
    }
}
