// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { BaseElement } from '../internal/BaseElement'
import { Session } from '@canton-network/core-wallet-user-rpc-client'

@customElement('wg-sessions')
export class WgSessions extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            .table-container {
                display: grid;
                grid-template-columns: 1fr;
                width: 100%;
                overflow-x: auto;
            }
            table {
                width: 100%;
                border: 1px solid var(--bs-border-color);
                border-collapse: collapse;
                background: #fff;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            }
            th,
            td {
                padding: 0.75rem 0.5rem;
                border-bottom: 1px solid #eee;
                text-align: left;
                font-size: 1rem;
            }
            th {
                background: var(--bs-secondary-bg);
                font-weight: 600;
            }
        `,
    ]

    @property({ type: Array }) sessions: Session[] = []

    connectedCallback(): void {
        super.connectedCallback()
    }

    protected render() {
        return html`
            <div class="mb-5">
                <div class="header"><h1>Sessions</h1></div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Network ID</th>
                                <th>Status</th>
                                <th>Reason</th>
                                <th>Access Token</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.sessions.map(
                                (session) => html`
                                    <tr>
                                        <td>${session.network.id}</td>
                                        <td>
                                            ${session.status === 'connected'
                                                ? '🟢'
                                                : '🔴'}
                                        </td>
                                        <td>${session.reason}</td>
                                        <td>
                                            <button
                                                type="button"
                                                class="btn btn-primary btn-sm"
                                                @click=${() =>
                                                    navigator.clipboard.writeText(
                                                        session.accessToken
                                                    )}
                                                title="Copy access token"
                                            >
                                                Copy to clipboard
                                            </button>
                                        </td>
                                    </tr>
                                `
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        `
    }
}
