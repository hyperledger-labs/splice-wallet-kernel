// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Network } from '@canton-network/core-wallet-store'
import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { styles } from '../styles/network.js'
import { BaseElement } from '../internal/BaseElement.js'

@customElement('network-table')
export class NetworkTable extends BaseElement {
    @property({ type: Array }) networks: Network[] = []

    static styles = [
        BaseElement.styles,
        styles,
        css`
            .card-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 1rem;
                margin: 1rem 0;
            }
            .network-card {
                background: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
                padding: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                min-width: 0;
            }
            .network-title {
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 0.25rem;
                color: #0052cc;
                word-break: break-all;
            }
            .network-meta {
                font-size: 0.95rem;
                color: #555;
                margin-bottom: 0.5rem;
                word-break: break-all;
            }
            .network-desc {
                font-size: 0.95rem;
                color: #333;
                margin-bottom: 0.5rem;
                word-break: break-all;
            }
            .network-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }
            button {
                padding: 0.4rem 0.8rem;
                font-size: 1rem;
                border-radius: 4px;
                border: 1px solid #ccc;
                background: #f5f5f5;
                cursor: pointer;
                transition: background 0.2s;
            }
            button:hover {
                background: #e2e6ea;
            }
            @media (max-width: 600px) {
                .card-list {
                    grid-template-columns: 1fr;
                }
                .network-card {
                    padding: 0.7rem;
                }
                button {
                    font-size: 0.9rem;
                    padding: 0.3rem 0.6rem;
                }
            }
        `,
    ]

    render() {
        return html`
            <div class="card-list">
                ${this.networks.map(
                    (net) => html`
                        <div class="network-card">
                            <div class="network-title">${net.name}</div>
                            <div class="network-meta">
                                <strong>ID:</strong> ${net.chainId}<br />
                                <strong>Auth:</strong> ${net.auth.type}<br />
                                <strong>Synchronizer:</strong>
                                ${net.synchronizerId}
                            </div>
                            <div class="network-desc">${net.description}</div>
                            <div class="network-actions">
                                <button>Update</button>
                                <button
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
                    `
                )}
            </div>
        `
    }
}
