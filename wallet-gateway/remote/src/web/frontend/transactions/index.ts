// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { css, html, LitElement, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'

import '@canton-network/core-wallet-ui-components'

import { createUserClient } from '../rpc-client'

import '../index'
import { stateManager } from '../state-manager'
import {
    CommandId,
    Transaction,
} from '@canton-network/core-wallet-user-rpc-client'
import { parsePreparedTransaction, PreparedTransactionParsed } from './decode'

@customElement('user-ui-transactions')
export class UserUiTransactions extends LitElement {
    @state()
    accessor transactions: Transaction[] = []

    @state()
    accessor parsedTransactions: Map<CommandId, PreparedTransactionParsed> =
        new Map()

    @state()
    accessor loading = false

    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            max-width: 900px;
            margin: 0 auto;
            font-family: var(--wg-theme-font-family, Arial, sans-serif);
        }
        .header {
            margin-bottom: 1rem;
        }
        .card-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .form-card,
        .wallet-card {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            min-width: 0;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        label {
            font-weight: 500;
            margin-bottom: 0.2rem;
        }
        .form-control {
            padding: 0.5rem;
            border: 1px solid var(--splice-wk-border-color, #ccc);
            border-radius: 4px;
            font-size: 1rem;
        }
        .inline {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .buttons {
            padding: 0.4rem 0.8rem;
            font-size: 1rem;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: #f5f5f5;
            cursor: pointer;
            transition: background 0.2s;
        }
        .buttons:hover {
            background: #e2e6ea;
        }
        .wallet-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
            color: #0052cc;
            word-break: break-all;
        }
        .wallet-meta {
            font-size: 0.95rem;
            color: #555;
            margin-bottom: 0.5rem;
            word-break: break-all;
        }
        .wallet-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
        }
        .status {
            font-size: 0.95rem;
            color: #009900;
        }
        @media (max-width: 600px) {
            .header h1 {
                font-size: 1.2rem;
            }
            .card-list {
                grid-template-columns: 1fr;
            }
            .wallet-card,
            .form-card {
                padding: 0.7rem;
            }
            .buttons {
                font-size: 0.9rem;
                padding: 0.3rem 0.6rem;
            }
        }
    `

    protected render() {
        return html`
            <div class="header">
                <h1>Transactions</h1>
            </div>

            <div class="card-list">
                ${this.transactions.map(
                    (tx) => html`
                        <div class="wallet-card">
                            <div class="wallet-title">${tx.commandId}</div>
                            <div class="wallet-meta">
                                <strong>Status:</strong>
                                <span class="status"> ${tx.status} </span>
                                <br />
                                <strong>Template:</strong>
                                ${this.parsedTransactions.get(tx.commandId)
                                    ?.packageName ||
                                'N/A'}:${this.parsedTransactions.get(
                                    tx.commandId
                                )?.moduleName ||
                                'N/A'}:${this.parsedTransactions.get(
                                    tx.commandId
                                )?.entityName || 'N/A'}
                                <br />
                                <strong>Signatories:</strong>
                                <ul>
                                    ${this.parsedTransactions
                                        .get(tx.commandId)
                                        ?.signatories?.map(
                                            (signatory) =>
                                                html`<li>${signatory}</li>`
                                        ) || html`<li>N/A</li>`}
                                </ul>
                                ${tx.createdAt
                                    ? html`<br />
                                          <strong>Created At:</strong>
                                          ${tx.createdAt}`
                                    : nothing}
                                ${tx.signedAt
                                    ? html`<br />
                                          <strong>Signed At:</strong>
                                          ${tx.signedAt}`
                                    : nothing}
                                ${tx.origin
                                    ? html`<br />
                                          <strong>Origin:</strong>
                                          ${tx.origin}`
                                    : nothing}
                            </div>
                            <div class="wallet-actions">
                                <button
                                    class="buttons"
                                    @click=${() =>
                                        (window.location.href = `/approve/index.html?commandId=${tx.commandId}`)}
                                >
                                    Review
                                </button>
                            </div>
                        </div>
                    `
                )}
            </div>
        `
    }

    connectedCallback(): void {
        super.connectedCallback()
        this.updateTransactions()
    }

    private async updateTransactions() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        userClient.request('listTransactions').then((result) => {
            this.transactions = result.transactions || []
            for (const tx of this.transactions) {
                try {
                    this.parsedTransactions.set(
                        tx.commandId,
                        parsePreparedTransaction(tx.preparedTransaction)
                    )
                } catch (error) {
                    console.error('Error parsing transaction:', error)
                }
            }
        })
    }
}
