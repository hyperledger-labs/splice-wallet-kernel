// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement'
import { html } from 'lit'
import { Idp } from '@canton-network/core-wallet-user-rpc-client'
import { cardStyles } from '../styles/card'

/** Emitted when the user clicks the "Delete" button on a network card */
export class IdpCardDeleteEvent extends Event {
    constructor(public idp: Idp) {
        super('delete', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Update" button on a network card */
export class IdpCardUpdateEvent extends Event {
    constructor() {
        super('update', { bubbles: true, composed: true })
    }
}

@customElement('idp-card')
export class IdpCard extends BaseElement {
    @property({ type: Object }) idp: Idp | null = null
    @property({ type: Boolean }) activeSession = false

    static styles = [BaseElement.styles, cardStyles]

    render() {
        let body = html`<p>no idp supplied</p>`

        if (this.idp !== null) {
            body = html` <h6 class="card-title text-primary fw-bold">
                    ${this.idp.id}
                </h6>
                <div class="network-meta">
                    <strong>Type:</strong> ${this.idp.type}<br />
                    <strong>Issuer:</strong>
                    ${this.idp.issuer}<br />
                    ${'configUrl' in this.idp
                        ? html`
                              <strong>Config URL:</strong> ${this.idp.configUrl}
                          `
                        : ''}
                    <br />
                </div>
                <div>
                    <button
                        ?disabled=${this.activeSession}
                        class="btn btn-sm btn-secondary"
                        @click=${() =>
                            this.dispatchEvent(new IdpCardUpdateEvent())}
                    >
                        Update
                    </button>
                    <button
                        ?disabled=${this.activeSession}
                        class="btn btn-sm btn-danger"
                        @click=${() =>
                            this.dispatchEvent(
                                new IdpCardDeleteEvent(this.idp!)
                            )}
                    >
                        Delete
                    </button>
                </div>`
        }

        return html`<div class="col card network-card">
            <div class="card-body">${body}</div>
        </div>`
    }
}
