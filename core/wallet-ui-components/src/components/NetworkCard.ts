// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { customElement, property, state } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement'
import { css, html } from 'lit'
import { Network } from '@canton-network/core-wallet-store'

/** Emitted when the user clicks the "Delete" button on a network card */
export class NetworkCardDeleteEvent extends Event {
    constructor(public network: Network) {
        super('delete', { bubbles: true, composed: true })
    }
}

/** Emitted when the user clicks the "Update" button on a network card */
export class NetworkCardUpdateEvent extends Event {
    constructor() {
        super('update', { bubbles: true, composed: true })
    }
}

@customElement('network-card')
export class NetworkCard extends BaseElement {
    @property({ type: Object }) network: Network | null = null

    @state() private _editing = false

    static styles = [
        BaseElement.styles,
        css`
            .network-card {
                background: #fff;
                border: none;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                min-width: 0;
            }
            .network-meta {
                color: var(--bs-gray-600);
                margin-bottom: 0.5rem;
                word-break: break-all;
            }
            .network-desc {
                color: var(--bs-gray-700);
                margin-bottom: 0.5rem;
                word-break: break-all;
            }
        `,
    ]

    render() {
        let body = html`<p>no network supplied</p>`

        if (this.network !== null) {
            if (this._editing) {
                body = html` <network-form
                    .network=${this.network}
                    @network-edit-cancel=${() => (this._editing = false)}
                    @network-edit-save=${() => (this._editing = false)}
                ></network-form>`
            } else {
                body = html` <h6 class="card-title text-primary fw-bold">
                        ${this.network.name}
                    </h6>
                    <div class="network-meta">
                        <strong>ID:</strong>
                        ${this.network.id}<br />
                        <strong>Auth:</strong> ${this.network.auth.type}<br />
                        <strong>Synchronizer:</strong>
                        ${this.network.synchronizerId}
                    </div>
                    <div class="network-desc">${this.network.description}</div>
                    <div>
                        <button
                            class="btn btn-secondary"
                            @click=${() => (this._editing = true)}
                        >
                            Update
                        </button>
                        <button
                            class="btn btn-danger"
                            @click=${() =>
                                this.dispatchEvent(
                                    new NetworkCardDeleteEvent(this.network!)
                                )}
                        >
                            Delete
                        </button>
                    </div>`
            }
        }

        return html`<div class="col card network-card">
            <div class="card-body">${body}</div>
        </div>`
    }
}
