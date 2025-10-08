// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@canton-network/core-wallet-store'
import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { BaseElement } from '../internal/BaseElement.js'

@customElement('network-table')
export class NetworkTable extends BaseElement {
    @property({ type: Array }) networks: Network[] = []

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
        return html`
            <div class="container p-0 m-0">
                <div
                    class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-md-2 g-lg-2 g-0"
                >
                    ${this.networks.map(
                        (net) => html`
                            <div class="col card network-card">
                                <div class="card-body">
                                    <h6 class="card-title text-primary fw-bold">
                                        ${net.name}
                                    </h6>
                                    <div class="network-meta">
                                        <strong>ID:</strong>
                                        ${net.chainId}<br />
                                        <strong>Auth:</strong> ${net.auth
                                            .type}<br />
                                        <strong>Synchronizer:</strong>
                                        ${net.synchronizerId}
                                    </div>
                                    <div class="network-desc">
                                        ${net.description}
                                    </div>
                                    <div>
                                        <button class="btn btn-secondary">
                                            Update
                                        </button>
                                        <button
                                            class="btn btn-danger"
                                            @click=${() =>
                                                this.dispatchEvent(
                                                    new CustomEvent('delete', {
                                                        detail: net,
                                                    })
                                                )}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `
                    )}
                </div>
            </div>
        `
    }
}
